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

  return Array.every(
    [isContextualReference, hasNoDirectCall, hasNoOtherReference],
    Boolean
  )
}

type CurriedDataLastCandidate =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

const candidateKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
]

const isCurriedDataLastCandidate = (
  node: ts.Node
): node is CurriedDataLastCandidate => {
  const conditions2 = [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ]

  return Array.some(conditions2, Boolean)
}

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
  Array.some(declaration.parameters, parameterHasRestToken)

const runtimeParameters = (
  declaration: CurriedDataLastCandidate
): ReadonlyArray<ts.ParameterDeclaration> =>
  Array.filter(declaration.parameters, isRuntimeParameter)

const hasDisallowedParameterList = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const hasMultipleRuntimeParameters = runtimeParameters(declaration).length > 1

  const conditions = [
    hasRestParameter(declaration),
    hasMultipleRuntimeParameters
  ]

  return Array.some(conditions, Boolean)
}

const hasCurriedArrowBody = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const parameters = runtimeParameters(declaration)
  const hasSingleRuntimeParameter = parameters.length === 1
  const hasNoRestParameter = !hasRestParameter(declaration)

  const hasCurriedParameterList = Array.every(
    [hasSingleRuntimeParameter, hasNoRestParameter],
    Boolean
  )

  const bodyIsFunctionInitializer = pipe(
    Option.liftPredicate(ts.isArrowFunction)(declaration),
    Option.flatMap(conciseArrowBody),
    Option.map(unwrapTransparentExpression),
    Option.exists(isFunctionInitializer)
  )

  return Array.every(
    [hasCurriedParameterList, bodyIsFunctionInitializer],
    Boolean
  )
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

          return Array.every(
            [hasDisallowedParameters, !hasCurriedBody, !isContextual],
            Boolean
          )
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

          const isDeclaration = Array.some(
            [isVariableName, isFunctionName, isMethodName],
            Boolean
          )

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
          ): boolean => Option.exists(type, hasCallableType(checker))

          const hasCallableContext = Array.some(
            [expressionContextualType, signatureType],
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

          const isContextualArgument = Array.every(
            [hasCallableContext, hasExternalCallbackBoundary],
            Boolean
          )

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

      const shouldReport = Array.every(
        [
          hasDisallowedParameters,
          !hasCurriedBody,
          !isContextual,
          !hasOnlyContextualUse
        ],
        Boolean
      )

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

  return nodeSubscriptions(candidateKinds)(isCurriedDataLastCandidate)(elements)
}

const check = withProgramIndex(buildSymbolUses)(curriedDataLastListeners)

export const preferCurriedDataLastFunctions: Check = check

export const preferCurriedDataLastFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-curried-data-last-functions")
