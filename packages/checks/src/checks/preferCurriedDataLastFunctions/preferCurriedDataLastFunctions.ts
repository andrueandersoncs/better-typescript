import { Array, Function, HashMap, HashSet, Option, Struct, pipe, flow } from "effect"
import * as ts from "typescript"
import { foldAst, isProjectSourceFile } from "@better-typescript/core/engine/sources"
import {
  conciseArrowBody,
  namedDetectionTarget,
  outermostTransparentWrapper,
  unwrapTransparentExpression
} from "../support/tsNode.js"
import {
  isFunctionDefinition,
  isFunctionInitializer,
  type FunctionDefinition
} from "../support/tsNode.js"
import {
  callArguments,
  isSameNode,
  resolvedCallSignature,
  signatureIsExternal
} from "../support/tsSignature.js"
import { hasCallSignature } from "../support/tsType.js"
import { type ReferenceKey, referenceKey } from "../support/referenceKey.js"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { makeSilentPlannedCheck } from "../../defineCheck.js"
import { SymbolUse, type SymbolUses, emptySymbolUses, fallbackEmptySymbolUse } from "./data.js"
import { nodeSubscriptions, makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const message = "Avoid rest parameters and multiple runtime parameters in one function."

const hint =
  "Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last."

const updateSymbolUse =
  (symbol: ts.Symbol) =>
  (update: (use: SymbolUse) => SymbolUse) =>
  (uses: SymbolUses): SymbolUses => {
    const symbolKey = referenceKey(symbol)
    const currentUse = pipe(HashMap.get(uses, symbolKey), Option.getOrElse(fallbackEmptySymbolUse))
    const updatedUse = update(currentUse)

    return HashMap.set(uses, symbolKey, updatedUse)
  }

const markContextualReference = (use: SymbolUse) =>
  SymbolUse.make({
    ...use,
    hasContextualReference: true
  })

const markDirectCall = (use: SymbolUse) =>
  SymbolUse.make({
    ...use,
    hasDirectCall: true
  })

const markOtherReference = (use: SymbolUse) =>
  SymbolUse.make({
    ...use,
    hasOtherReference: true
  })

const isContextualOnlyUse = (use: SymbolUse) => {
  const isContextualReference = use.hasContextualReference
  const hasNoDirectCall = !use.hasDirectCall
  const hasNoOtherReference = !use.hasOtherReference

  const referenceConditions = Array.make(
    isContextualReference,
    hasNoDirectCall,
    hasNoOtherReference
  )

  return Array.every(referenceConditions, Boolean)
}

const functionDefinitionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
)

const isRuntimeParameter = (parameter: ts.ParameterDeclaration) => {
  const sourceFile = parameter.getSourceFile()
  const parameterName = parameter.name.getText(sourceFile)

  return parameterName !== "this"
}

const parameterHasRestToken = (parameter: ts.ParameterDeclaration) =>
  pipe(Option.fromNullishOr(parameter.dotDotDotToken), Option.isSome)

const hasRestParameter = (declaration: ts.Node) => {
  const definitionHasRestParameter = (functionDefinition: FunctionDefinition) =>
    Array.some(functionDefinition.parameters, parameterHasRestToken)

  return pipe(
    Option.liftPredicate(isFunctionDefinition)(declaration),
    Option.exists(definitionHasRestParameter)
  )
}

const runtimeParameters = (declaration: ts.Node): ReadonlyArray<ts.ParameterDeclaration> => {
  const runtimeParametersOf = (functionDefinition: FunctionDefinition) =>
    Array.filter(functionDefinition.parameters, isRuntimeParameter)

  return pipe(
    Option.liftPredicate(isFunctionDefinition)(declaration),
    Option.map(runtimeParametersOf),
    Option.getOrElse(Array.empty)
  )
}

const hasDisallowedParameterList = (declaration: ts.Node) => {
  const declarationHasRestParameter = hasRestParameter(declaration)
  const hasMultipleRuntimeParameters = runtimeParameters(declaration).length > 1
  const conditions = Array.make(declarationHasRestParameter, hasMultipleRuntimeParameters)

  return Array.some(conditions, Boolean)
}

const hasCurriedArrowBody = (declaration: ts.Node) => {
  const parameters = runtimeParameters(declaration)
  const hasSingleRuntimeParameter = strictEqual(1)(parameters.length)
  const hasNoRestParameter = !hasRestParameter(declaration)
  const parameterChecks = Array.make(hasSingleRuntimeParameter, hasNoRestParameter)
  const hasCurriedParameterList = Array.every(parameterChecks, Boolean)

  const bodyIsFunctionInitializer = pipe(
    Option.liftPredicate(ts.isArrowFunction)(declaration),
    Option.flatMap(conciseArrowBody),
    Option.map(unwrapTransparentExpression),
    Option.exists(isFunctionInitializer)
  )

  const curriedInitializerChecks = Array.make(hasCurriedParameterList, bodyIsFunctionInitializer)

  return Array.every(curriedInitializerChecks, Boolean)
}

const contextualType = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(checker.getContextualType(expression), Option.fromNullishOr)

const isContextuallyTypedFunction = (checker: ts.TypeChecker) => (declaration: ts.Node) => {
  const expressionHasCallSignature = (expression: ts.Expression) =>
    pipe(contextualType(checker)(expression), Option.exists(hasCallSignature(checker)))

  return pipe(
    Option.liftPredicate(isFunctionInitializer)(declaration),
    Option.exists(expressionHasCallSignature)
  )
}

const symbolAtLocation = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullishOr,
    Option.map((candidate) => {
      const isAlias = (candidate.flags & ts.SymbolFlags.Alias) !== 0

      return isAlias ? checker.getAliasedSymbol(candidate) : candidate
    })
  )

// NamedFunctionDeclaration is naming syntax protocol because function and method share lookup.
export type NamedFunctionDeclaration = ts.FunctionDeclaration | ts.MethodDeclaration

const namedFunctionDeclarationName = (
  declaration: NamedFunctionDeclaration
): Option.Option<ts.Node> => Option.fromNullishOr(declaration.name)

const variableDeclarationIdentifierName = (declaration: ts.VariableDeclaration) =>
  pipe(Option.some(declaration.name), Option.flatMap(Option.liftPredicate(ts.isIdentifier)))

const symbolForDeclaration = (checker: ts.TypeChecker) => (declaration: ts.Node) => {
  const methodName = pipe(
    Option.liftPredicate(ts.isMethodDeclaration)(declaration),
    Option.flatMap(namedFunctionDeclarationName)
  )

  const variableName = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration.parent),
    Option.flatMap(variableDeclarationIdentifierName)
  )

  const declarationName = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
    Option.flatMap(namedFunctionDeclarationName),
    Option.orElse(Function.constant(methodName)),
    Option.orElse(Function.constant(variableName))
  )

  return pipe(declarationName, Option.flatMap(symbolAtLocation(checker)))
}

const foldCurriedDataLastDescendants = <A>(visit: (node: ts.Node) => (accumulator: A) => A) =>
  foldAst((current: A, currentNode: ts.Node): A => visit(currentNode)(current))

// NameDeclaration is naming syntax protocol because variable, function, and method share lookup.
export type NameDeclaration = ts.VariableDeclaration | ts.FunctionDeclaration | ts.MethodDeclaration

const declarationHasName = (identifier: ts.Identifier) =>
  flow(Struct.get<NameDeclaration, "name">("name"), strictEqual(identifier))

const buildSymbolUses = (context: ProgramContext) => {
  const checker = context.checker
  const programSourceFiles = context.program.getSourceFiles()
  const sourceFiles = Array.filter(programSourceFiles, isProjectSourceFile)

  const collectTrackedSymbol =
    (node: ts.Node) =>
    (
      currentSymbols: HashSet.HashSet<ReferenceKey<ts.Symbol>>
    ): HashSet.HashSet<ReferenceKey<ts.Symbol>> =>
      pipe(
        Option.liftPredicate(isFunctionDefinition)(node),
        Option.filter((declaration) => {
          const hasDisallowedParameters = hasDisallowedParameterList(declaration)
          const hasCurriedBody = hasCurriedArrowBody(declaration)
          const isContextual = isContextuallyTypedFunction(checker)(declaration)

          const reportableCurryChecks = Array.make(
            hasDisallowedParameters,
            !hasCurriedBody,
            !isContextual
          )

          return Array.every(reportableCurryChecks, Boolean)
        }),
        Option.flatMap(symbolForDeclaration(checker)),
        Option.map((symbol) => {
          const symbolKey = referenceKey(symbol)

          return HashSet.add(currentSymbols, symbolKey)
        }),
        Option.getOrElse(() => currentSymbols)
      )

  const emptyTrackedSymbols = HashSet.empty<ReferenceKey<ts.Symbol>>()

  const trackedSymbols = Array.reduce(sourceFiles, emptyTrackedSymbols, (symbols, sourceFile) =>
    foldCurriedDataLastDescendants(collectTrackedSymbol)(sourceFile)(symbols)
  )

  const classifyNode = (node: ts.Node) => (currentUses: SymbolUses) => {
    if (!ts.isIdentifier(node)) {
      return currentUses
    }

    return pipe(
      symbolAtLocation(checker)(node),
      Option.filter((symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashSet.has(trackedSymbols, symbolKey)
      }),
      Option.map((symbol) => {
        const identifierParent = node.parent

        const isVariableName = pipe(
          Option.liftPredicate(ts.isVariableDeclaration)(identifierParent),
          Option.exists(declarationHasName(node))
        )

        const isFunctionName = pipe(
          Option.liftPredicate(ts.isFunctionDeclaration)(identifierParent),
          Option.exists(declarationHasName(node))
        )

        const isMethodName = pipe(
          Option.liftPredicate(ts.isMethodDeclaration)(identifierParent),
          Option.exists(declarationHasName(node))
        )

        const declarationNameChecks = Array.make(isVariableName, isFunctionName, isMethodName)
        const isDeclaration = Array.some(declarationNameChecks, Boolean)

        if (isDeclaration) {
          return currentUses
        }

        const expression = outermostTransparentWrapper(node)
        const expressionParent = expression.parent

        const callUsesExpression = flow(
          Struct.get<ts.CallExpression, "expression">("expression"),
          strictEqual(expression)
        )

        const isDirectCall = pipe(
          Option.liftPredicate(ts.isCallExpression)(expressionParent),
          Option.exists(callUsesExpression)
        )

        if (isDirectCall) {
          return updateSymbolUse(symbol)(markDirectCall)(currentUses)
        }

        const parentCall = Option.liftPredicate(ts.isCallExpression)(expression.parent)
        const args = pipe(parentCall, Option.map(callArguments), Option.getOrElse(Array.empty))
        const index = Array.findFirstIndex(args, isSameNode(expression))
        const expressionContextualType = contextualType(checker)(expression)

        const signatureType = pipe(
          parentCall,
          Option.flatMap((call) => {
            const typeOfCallParameter = (parameter: ts.Symbol) =>
              checker.getTypeOfSymbolAtLocation(parameter, call)

            const parameterTypeAt = (position: number) => {
              const signature = resolvedCallSignature(checker)(call)

              const parameters = pipe(
                signature,
                Option.map(Struct.get("parameters")),
                Option.getOrElse(Array.empty)
              )

              const parameter = Array.get(parameters, position)

              return Option.map(parameter, typeOfCallParameter)
            }

            return pipe(index, Option.flatMap(parameterTypeAt))
          })
        )

        const optionHasCallableType = (type: Option.Option<ts.Type>) =>
          Option.exists(type, hasCallSignature(checker))

        const contextualTypes = Array.make(expressionContextualType, signatureType)
        const hasCallableContext = Array.some(contextualTypes, optionHasCallableType)

        const callHasExternalCallbackBoundary = (call: ts.CallExpression) =>
          pipe(resolvedCallSignature(checker)(call), Option.exists(signatureIsExternal))

        const hasExternalCallbackBoundary = pipe(
          parentCall,
          Option.exists(callHasExternalCallbackBoundary)
        )

        const contextualArgumentChecks = Array.make(hasCallableContext, hasExternalCallbackBoundary)
        const isContextualArgument = Array.every(contextualArgumentChecks, Boolean)
        const referenceUpdate = isContextualArgument ? markContextualReference : markOtherReference

        return updateSymbolUse(symbol)(referenceUpdate)(currentUses)
      }),
      Option.getOrElse(() => currentUses)
    )
  }

  return Array.reduce(sourceFiles, emptySymbolUses, (uses, sourceFile) =>
    foldCurriedDataLastDescendants(classifyNode)(sourceFile)(uses)
  )
}

const curriedDataLastListeners = (symbolUses: SymbolUses): ReadonlyArray<Subscription> => {
  const elements = (context: CheckContext) => {
    const makeElement = makeDetection(context)

    const matches = (declaration: ts.Node): ReadonlyArray<Detection> => {
      if (!isFunctionDefinition(declaration)) {
        return Array.empty()
      }

      const hasDisallowedParameters = hasDisallowedParameterList(declaration)
      const hasCurriedBody = hasCurriedArrowBody(declaration)
      const isContextual = isContextuallyTypedFunction(context.checker)(declaration)

      const hasOnlyContextualUse = pipe(
        symbolForDeclaration(context.checker)(declaration),
        Option.flatMap((symbol) => {
          const symbolKey = referenceKey(symbol)

          return HashMap.get(symbolUses, symbolKey)
        }),
        Option.exists(isContextualOnlyUse)
      )

      const finalReportChecks = Array.make(
        hasDisallowedParameters,
        !hasCurriedBody,
        !isContextual,
        !hasOnlyContextualUse
      )

      const shouldReport = Array.every(finalReportChecks, Boolean)

      if (!shouldReport) {
        return Array.empty()
      }

      const functionTarget = pipe(
        Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
        Option.map(namedDetectionTarget)
      )

      const methodTarget = pipe(
        Option.liftPredicate(ts.isMethodDeclaration)(declaration),
        Option.map(namedDetectionTarget)
      )

      const node = pipe(
        functionTarget,
        Option.orElse(Function.constant(methodTarget)),
        Option.getOrElse(Function.constant(declaration))
      )

      const detection = makeElement({
        node,
        message,
        hint
      })

      return Array.of(detection)
    }

    return matches
  }

  return nodeSubscriptions(functionDefinitionKinds)(isFunctionDefinition)(elements)
}

const preferCurriedDataLastFunctionsPlan = Function.compose(
  buildSymbolUses,
  curriedDataLastListeners
)

export const preferCurriedDataLastFunctions = makeSilentPlannedCheck(
  "prefer-curried-data-last-functions",
  preferCurriedDataLastFunctionsPlan
)
