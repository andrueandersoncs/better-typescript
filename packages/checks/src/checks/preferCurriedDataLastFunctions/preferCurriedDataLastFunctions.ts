import { Array, Function, HashMap, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import {
  nodeSubscriptions,
  withProgramIndex
} from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import {
  conciseArrowBody,
  isFunctionInitializer,
  namedDetectionTarget,
  outermostTransparentWrapper,
  unwrapTransparentExpression
} from "../support/tsNode.js"
import {
  foldAst,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import {
  resolvedCallSignature,
  signatureIsExternal
} from "../support/tsSignature.js"
import { hasCallSignature } from "../support/tsType.js"
import type { Check } from "@better-typescript/core/engine/check"
import type {
  CheckContext,
  Subscription
} from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import {
  SymbolUse,
  type SymbolUses,
  emptySymbolUses,
  fallbackEmptySymbolUse
} from "./data.js"

const updateSymbolUse =
  (symbol: ts.Symbol) =>
  (update: (use: SymbolUse) => SymbolUse) =>
  (uses: SymbolUses): SymbolUses => {
    const currentUse = pipe(
      HashMap.get(uses, symbol),
      Option.getOrElse(fallbackEmptySymbolUse)
    )

    const updatedUse = update(currentUse)

    return HashMap.set(uses, symbol, updatedUse)
  }

const markContextualReference = (use: SymbolUse): SymbolUse =>
  new SymbolUse({
    ...use,
    hasContextualReference: true
  })

const markDirectCall = (use: SymbolUse): SymbolUse =>
  new SymbolUse({
    ...use,
    hasDirectCall: true
  })

const markOtherReference = (use: SymbolUse): SymbolUse =>
  new SymbolUse({
    ...use,
    hasOtherReference: true
  })

const isContextualOnlyUse = (use: SymbolUse): boolean => {
  const isContextualReference = use.hasContextualReference
  const hasNoDirectCall = !use.hasDirectCall
  const hasNoOtherReference = !use.hasOtherReference

  const values122 = Array.make(
    isContextualReference,
    hasNoDirectCall,
    hasNoOtherReference
  )

  return Array.every(values122, Boolean)
}

type CurriedDataLastCandidate =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

const candidateKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
)

const isCurriedDataLastCandidate = (
  node: ts.Node
): node is CurriedDataLastCandidate => {
  const value123 = ts.isFunctionDeclaration(node)
  const value124 = ts.isFunctionExpression(node)
  const value125 = ts.isArrowFunction(node)
  const value126 = ts.isMethodDeclaration(node)
  const conditions2 = Array.make(value123, value124, value125, value126)

  return Array.some(conditions2, Boolean)
}

const isRuntimeParameter = (parameter: ts.ParameterDeclaration): boolean => {
  const sourceFile = parameter.getSourceFile()
  const parameterName = parameter.name.getText(sourceFile)

  return parameterName !== "this"
}

const parameterHasRestToken = (parameter: ts.ParameterDeclaration): boolean =>
  pipe(Option.fromNullable(parameter.dotDotDotToken), Option.isSome)

const hasRestParameter = (declaration: CurriedDataLastCandidate): boolean =>
  Array.some(declaration.parameters, parameterHasRestToken)

const runtimeParameters = (
  declaration: CurriedDataLastCandidate
): ReadonlyArray<ts.ParameterDeclaration> =>
  Array.filter(declaration.parameters, isRuntimeParameter)

const hasDisallowedParameterList = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const hasMultipleRuntimeParameters = runtimeParameters(declaration).length > 1

  const value127 = hasRestParameter(declaration)
  const conditions = Array.make(value127, hasMultipleRuntimeParameters)

  return Array.some(conditions, Boolean)
}

const hasCurriedArrowBody = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const parameters = runtimeParameters(declaration)
  const hasSingleRuntimeParameter = parameters.length === 1
  const hasNoRestParameter = !hasRestParameter(declaration)

  const values128 = Array.make(hasSingleRuntimeParameter, hasNoRestParameter)
  const hasCurriedParameterList = Array.every(values128, Boolean)

  const bodyIsFunctionInitializer = pipe(
    Option.liftPredicate(ts.isArrowFunction)(declaration),
    Option.flatMap(conciseArrowBody),
    Option.map(unwrapTransparentExpression),
    Option.exists(isFunctionInitializer)
  )

  const values129 = Array.make(
    hasCurriedParameterList,
    bodyIsFunctionInitializer
  )

  return Array.every(values129, Boolean)
}

const contextualType =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<ts.Type> =>
    pipe(checker.getContextualType(expression), Option.fromNullable)

const isContextuallyTypedFunction =
  (checker: ts.TypeChecker) =>
  (declaration: CurriedDataLastCandidate): boolean =>
    pipe(
      Option.liftPredicate(isFunctionInitializer)(declaration),
      Option.exists((expression) =>
        pipe(
          contextualType(checker)(expression),
          Option.exists(hasCallSignature(checker))
        )
      )
    )

const symbolAtLocation =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> =>
    pipe(
      checker.getSymbolAtLocation(node),
      Option.fromNullable,
      Option.map((candidate) => {
        const isAlias = (candidate.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(candidate) : candidate
      })
    )

type NamedFunctionDeclaration = ts.FunctionDeclaration | ts.MethodDeclaration

const namedFunctionDeclarationName = (
  declaration: NamedFunctionDeclaration
): Option.Option<ts.Node> => Option.fromNullable(declaration.name)

const variableDeclarationIdentifierName = (
  declaration: ts.VariableDeclaration
): Option.Option<ts.Identifier> =>
  pipe(
    Option.some(declaration.name),
    Option.flatMap(Option.liftPredicate(ts.isIdentifier))
  )

const symbolForDeclaration =
  (checker: ts.TypeChecker) =>
  (declaration: CurriedDataLastCandidate): Option.Option<ts.Symbol> => {
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

const foldCurriedDataLastDescendants = <A>(
  visit: (node: ts.Node) => (accumulator: A) => A
) =>
  foldAst((current: A, currentNode: ts.Node): A => visit(currentNode)(current))

type NameDeclaration =
  ts.VariableDeclaration | ts.FunctionDeclaration | ts.MethodDeclaration

const declarationHasName =
  (identifier: ts.Identifier) =>
  (declaration: NameDeclaration): boolean =>
    declaration.name === identifier

const buildSymbolUses = (context: ProgramContext): SymbolUses => {
  const checker = context.checker
  const programSourceFiles = context.program.getSourceFiles()
  const sourceFiles = Array.filter(programSourceFiles, isProjectSourceFile)

  const collectTrackedSymbol =
    (node: ts.Node) =>
    (currentSymbols: HashSet.HashSet<ts.Symbol>): HashSet.HashSet<ts.Symbol> =>
      pipe(
        Option.liftPredicate(isCurriedDataLastCandidate)(node),
        Option.filter((declaration) => {
          const hasDisallowedParameters =
            hasDisallowedParameterList(declaration)

          const hasCurriedBody = hasCurriedArrowBody(declaration)

          const isContextual = isContextuallyTypedFunction(checker)(declaration)

          const values130 = Array.make(
            hasDisallowedParameters,
            !hasCurriedBody,
            !isContextual
          )

          return Array.every(values130, Boolean)
        }),
        Option.flatMap(symbolForDeclaration(checker)),
        Option.map((symbol) => HashSet.add(currentSymbols, symbol)),
        Option.getOrElse(() => currentSymbols)
      )

  const emptyTrackedSymbols = HashSet.empty<ts.Symbol>()

  const trackedSymbols = Array.reduce(
    sourceFiles,
    emptyTrackedSymbols,
    (symbols, sourceFile) =>
      foldCurriedDataLastDescendants(collectTrackedSymbol)(sourceFile)(symbols)
  )

  const classifyNode =
    (node: ts.Node) =>
    (currentUses: SymbolUses): SymbolUses => {
      if (!ts.isIdentifier(node)) {
        return currentUses
      }

      return pipe(
        symbolAtLocation(checker)(node),
        Option.filter((symbol) => HashSet.has(trackedSymbols, symbol)),
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

          const values131 = Array.make(
            isVariableName,
            isFunctionName,
            isMethodName
          )

          const isDeclaration = Array.some(values131, Boolean)

          if (isDeclaration) {
            return currentUses
          }

          const expression = outermostTransparentWrapper(node)
          const expressionParent = expression.parent

          const isDirectCall = pipe(
            Option.liftPredicate(ts.isCallExpression)(expressionParent),
            Option.exists((call) => call.expression === expression)
          )

          if (isDirectCall) {
            return updateSymbolUse(symbol)(markDirectCall)(currentUses)
          }

          const parentCall = Option.liftPredicate(ts.isCallExpression)(
            expression.parent
          )

          const isSameExpression = (candidate: ts.Expression): boolean =>
            candidate === expression

          const index = ts.isCallExpression(expression.parent)
            ? Array.findFirstIndex(
                expression.parent.arguments,
                isSameExpression
              )
            : Option.none()

          const expressionContextualType = contextualType(checker)(expression)

          const signatureType = pipe(
            parentCall,
            Option.flatMap((call) =>
              pipe(
                index,
                Option.flatMap((position) =>
                  pipe(
                    resolvedCallSignature(checker)(call),
                    Option.flatMap((signature) =>
                      Option.fromNullable(signature.parameters[position])
                    ),
                    Option.map((parameter) =>
                      checker.getTypeOfSymbolAtLocation(parameter, call)
                    )
                  )
                )
              )
            )
          )

          const optionHasCallableType = (
            type: Option.Option<ts.Type>
          ): boolean => Option.exists(type, hasCallSignature(checker))

          const values132 = Array.make(expressionContextualType, signatureType)

          const hasCallableContext = Array.some(
            values132,
            optionHasCallableType
          )

          const hasExternalCallbackBoundary = pipe(
            parentCall,
            Option.exists((call) =>
              pipe(
                resolvedCallSignature(checker)(call),
                Option.exists(signatureIsExternal)
              )
            )
          )

          const values133 = Array.make(
            hasCallableContext,
            hasExternalCallbackBoundary
          )

          const isContextualArgument = Array.every(values133, Boolean)

          const referenceUpdate = isContextualArgument
            ? markContextualReference
            : markOtherReference

          return updateSymbolUse(symbol)(referenceUpdate)(currentUses)
        }),
        Option.getOrElse(() => currentUses)
      )
    }

  return Array.reduce(sourceFiles, emptySymbolUses, (uses, sourceFile) =>
    foldCurriedDataLastDescendants(classifyNode)(sourceFile)(uses)
  )
}

const curriedDataLastListeners = (
  symbolUses: SymbolUses
): ReadonlyArray<Subscription> => {
  const elements = (context: CheckContext) => {
    const makeElement = detection(context)

    const matches = (
      declaration: CurriedDataLastCandidate
    ): ReadonlyArray<Detection> => {
      const hasDisallowedParameters = hasDisallowedParameterList(declaration)
      const hasCurriedBody = hasCurriedArrowBody(declaration)

      const isContextual = isContextuallyTypedFunction(context.checker)(
        declaration
      )

      const hasOnlyContextualUse = pipe(
        symbolForDeclaration(context.checker)(declaration),
        Option.flatMap((symbol) => HashMap.get(symbolUses, symbol)),
        Option.exists(isContextualOnlyUse)
      )

      const values134 = Array.make(
        hasDisallowedParameters,
        !hasCurriedBody,
        !isContextual,
        !hasOnlyContextualUse
      )

      const shouldReport = Array.every(values134, Boolean)

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

      const value135 = makeElement({
        node,
        message: "",
        hint: ""
      })

      return Array.of(value135)
    }

    return matches
  }

  return nodeSubscriptions(candidateKinds)(isCurriedDataLastCandidate)(elements)
}

const check = withProgramIndex(buildSymbolUses)(curriedDataLastListeners)

export const preferCurriedDataLastFunctions: Check = check

export const preferCurriedDataLastFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-curried-data-last-functions")
