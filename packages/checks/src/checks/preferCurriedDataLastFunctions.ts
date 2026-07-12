import { Array, Function, HashMap, HashSet, Option, Schema, pipe } from "effect"
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
} from "./support/tsNode.js"
import {
  foldAst,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import {
  resolvedCallSignature,
  signatureIsExternal
} from "./support/tsSignature.js"
import { hasCallSignature } from "./support/tsType.js"
import type { Check, CheckContext, Subscription } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { ProgramContext } from "@better-typescript/core/engine/sources"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

type CurriedDataLastCandidate =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

type SymbolUses = HashMap.HashMap<ts.Symbol, SymbolUse>

class SymbolUse extends Schema.Class<SymbolUse>("SymbolUse")({
  hasContextualReference: Schema.Boolean,
  hasDirectCall: Schema.Boolean,
  hasOtherReference: Schema.Boolean
}) {}

const emptySymbolUse = new SymbolUse({
  hasContextualReference: false,
  hasDirectCall: false,
  hasOtherReference: false
})

const emptySymbolUses: SymbolUses = HashMap.empty()

const candidateKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
]

const isCurriedDataLastCandidate = (
  node: ts.Node
): node is CurriedDataLastCandidate =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ].some(Boolean)

const isRuntimeParameter = (parameter: ts.ParameterDeclaration): boolean => {
  const sourceFile = parameter.getSourceFile()
  const parameterName = parameter.name.getText(sourceFile)

  return parameterName !== "this"
}

const parameterHasRestToken = (parameter: ts.ParameterDeclaration): boolean => {
  const restToken = Option.fromNullable(parameter.dotDotDotToken)

  return Option.isSome(restToken)
}

const hasRestParameter = (declaration: CurriedDataLastCandidate): boolean =>
  declaration.parameters.some(parameterHasRestToken)

const runtimeParameters = (
  declaration: CurriedDataLastCandidate
): ReadonlyArray<ts.ParameterDeclaration> =>
  declaration.parameters.filter(isRuntimeParameter)

const hasDisallowedParameterList = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const hasMultipleRuntimeParameters = runtimeParameters(declaration).length > 1

  return [hasRestParameter(declaration), hasMultipleRuntimeParameters].some(
    Boolean
  )
}

const hasCurriedArrowBody = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const parameters = runtimeParameters(declaration)
  const hasSingleRuntimeParameter = parameters.length === 1
  const hasNoRestParameter = !hasRestParameter(declaration)
  const hasCurriedParameterList = [
    hasSingleRuntimeParameter,
    hasNoRestParameter
  ].every(Boolean)
  const bodyIsFunctionInitializer = pipe(
    Option.liftPredicate(ts.isArrowFunction)(declaration),
    Option.flatMap(conciseArrowBody),
    Option.map(unwrapTransparentExpression),
    Option.exists(isFunctionInitializer)
  )

  return [hasCurriedParameterList, bodyIsFunctionInitializer].every(Boolean)
}

const hasCallableType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): boolean =>
    hasCallSignature(checker)(type)

const contextualType =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getContextualType(expression)

    return Option.fromNullable(type)
  }

const isContextuallyTypedFunction =
  (checker: ts.TypeChecker) =>
  (declaration: CurriedDataLastCandidate): boolean =>
    pipe(
      Option.liftPredicate(isFunctionInitializer)(declaration),
      Option.exists((expression) =>
        pipe(
          contextualType(checker)(expression),
          Option.exists(hasCallableType(checker))
        )
      )
    )

const symbolAtLocation =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> => {
    const symbol = checker.getSymbolAtLocation(node)

    return pipe(
      Option.fromNullable(symbol),
      Option.map((candidate) => {
        const isAlias = (candidate.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(candidate) : candidate
      })
    )
  }

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

const foldCurriedDataLastDescendants =
  <A>(visit: (node: ts.Node) => (accumulator: A) => A) =>
  (node: ts.Node) =>
  (accumulator: A): A =>
    foldAst((current: A, currentNode: ts.Node): A =>
      visit(currentNode)(current)
    )(node)(accumulator)

const fallbackEmptySymbolUse: () => SymbolUse =
  Function.constant(emptySymbolUse)

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

type NameDeclaration =
  | ts.VariableDeclaration
  | ts.FunctionDeclaration
  | ts.MethodDeclaration

const declarationHasName =
  (identifier: ts.Identifier) =>
  (declaration: NameDeclaration): boolean =>
    declaration.name === identifier

const buildSymbolUses = (context: ProgramContext): SymbolUses => {
  const checker = context.checker
  const sourceFiles = context.program
    .getSourceFiles()
    .filter(isProjectSourceFile)

  const collectTrackedSymbol =
    (node: ts.Node) =>
    (
      currentSymbols: HashSet.HashSet<ts.Symbol>
    ): HashSet.HashSet<ts.Symbol> =>
      pipe(
        Option.liftPredicate(isCurriedDataLastCandidate)(node),
        Option.filter((declaration) => {
          const hasDisallowedParameters =
            hasDisallowedParameterList(declaration)
          const hasCurriedBody = hasCurriedArrowBody(declaration)
          const isContextual = isContextuallyTypedFunction(checker)(
            declaration
          )

          return [
            hasDisallowedParameters,
            !hasCurriedBody,
            !isContextual
          ].every(Boolean)
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
      foldCurriedDataLastDescendants(collectTrackedSymbol)(sourceFile)(
        symbols
      )
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
          const isDeclaration = [
            isVariableName,
            isFunctionName,
            isMethodName
          ].some(Boolean)

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
          const argumentPosition = ts.isCallExpression(expression.parent)
            ? expression.parent.arguments.findIndex(isSameExpression)
            : -1
          const index =
            argumentPosition < 0
              ? Option.none()
              : Option.some(argumentPosition)
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
          ): boolean => Option.exists(type, hasCallableType(checker))
          const hasCallableContext = [
            expressionContextualType,
            signatureType
          ].some(optionHasCallableType)
          const hasExternalCallbackBoundary = pipe(
            parentCall,
            Option.exists((call) =>
              pipe(
                resolvedCallSignature(checker)(call),
                Option.exists(signatureIsExternal)
              )
            )
          )
          const isContextualArgument = [
            hasCallableContext,
            hasExternalCallbackBoundary
          ].every(Boolean)
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
const isContextualOnlyUse = (use: SymbolUse): boolean => {
  const isContextualReference = use.hasContextualReference
  const hasNoDirectCall = !use.hasDirectCall
  const hasNoOtherReference = !use.hasOtherReference

  return [isContextualReference, hasNoDirectCall, hasNoOtherReference].every(
    Boolean
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
      const shouldReport = [
        hasDisallowedParameters,
        !hasCurriedBody,
        !isContextual,
        !hasOnlyContextualUse
      ].every(Boolean)

      if (!shouldReport) {
        return []
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

      return [
        makeElement({
          node,
          message: "",
          hint: ""
        })
      ]
    }

    return matches
  }

  return nodeSubscriptions(candidateKinds)(isCurriedDataLastCandidate)(
    elements
  )
}
const check = withProgramIndex(buildSymbolUses)(curriedDataLastListeners)

export const preferCurriedDataLastFunctions: Check = check

export const preferCurriedDataLastFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-curried-data-last-functions")
