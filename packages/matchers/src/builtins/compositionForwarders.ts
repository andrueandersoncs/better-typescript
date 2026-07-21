import { Array, Function, Match, Option, Struct, flow, pipe, Result } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { CompositionForwarderData } from "./architectureExploreData.js"
import { isTestSourceFile } from "./architectureExplore/paths.js"
import {
  ExportReferenceIndex,
  type ExportedFunctionEntry,
  usageFor
} from "./architectureExplore/programSymbols.js"
import {
  evidenceMatcher,
  exportReferenceIndex
} from "./architectureExplore/architectureEvidence.js"
import { isExpressionBody, unwrapTransparentExpression } from "../support/tsNode.js"
import { fileSubscriptions } from "@better-typescript/matchers/matcher"
import {
  makeNodeMatch,
  type Match as MatcherMatch,
  type MatchContext
} from "@better-typescript/matchers/matcher/data"

const emptyParameterNames: ReadonlyArray<string> = Array.empty()

const expressionFromConciseBody = (body: ts.ConciseBody) => {
  const expressionBody = pipe(
    Option.some(body),
    Option.filter(isExpressionBody),
    Option.map(unwrapTransparentExpression)
  )

  const singleStatementBlock = (block: ts.Block) => strictEqual(1)(block.statements.length)

  const blockBody = pipe(
    Option.some(body),
    Option.filter(ts.isBlock),
    Option.filter(singleStatementBlock),
    Option.flatMap(Function.flow(Struct.get("statements"), Array.head)),
    Option.filter(ts.isReturnStatement),
    Option.flatMap(Function.flow(Struct.get("expression"), Option.fromNullishOr)),
    Option.map(unwrapTransparentExpression)
  )

  return pipe(expressionBody, Option.orElse(Function.constant(blockBody)))
}

const nestedSingleParamArrow = (arrow: ts.ArrowFunction) => strictEqual(1)(arrow.parameters.length)

const finalCompositionCall = (arrow: ts.ArrowFunction): Option.Option<ts.CallExpression> =>
  pipe(
    expressionFromConciseBody(arrow.body),
    Option.flatMap((expression) => {
      const nestedCall = pipe(
        Option.some(expression),
        Option.filter(ts.isArrowFunction),
        Option.filter(nestedSingleParamArrow),
        Option.flatMap(finalCompositionCall)
      )

      const call = Option.liftPredicate(ts.isCallExpression)(expression)

      return pipe(nestedCall, Option.orElse(Function.constant(call)))
    })
  )

const isAllowedCompositionExpression = (expression: ts.Expression): boolean =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isIdentifier, Function.constTrue),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const propertyNameIsIdentifier = ts.isIdentifier(access.name)
      const receiverAllowed = isAllowedCompositionExpression(access.expression)
      const checks = Array.make(propertyNameIsIdentifier, receiverAllowed)

      return Array.every(checks, Boolean)
    }),
    Match.when(ts.isCallExpression, (call) => {
      const calleeAllowed = isAllowedCompositionExpression(call.expression)
      const argumentsAllowed = Array.every(call.arguments, isAllowedCompositionExpression)
      const checks = Array.make(calleeAllowed, argumentsAllowed)

      return Array.every(checks, Boolean)
    }),
    Match.orElse(Function.constFalse)
  )

// Forwarder stepCount counts only CallExpressions because fingerprints also count pipe/flow stages.
const countPropertyAccessCalls = (access: ts.PropertyAccessExpression) =>
  callExpressionCount(access.expression)

const callExpressionCount = (expression: ts.Expression): number =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isCallExpression, (call) => {
      const nestedInCallee = callExpressionCount(call.expression)

      const nestedInArguments = Array.reduce(
        call.arguments,
        0,
        (total, argument) => total + callExpressionCount(argument)
      )

      return 1 + nestedInCallee + nestedInArguments
    }),
    Match.when(ts.isPropertyAccessExpression, countPropertyAccessCalls),
    Match.orElse(Function.constant(0))
  )

const parameterNameText = (parameter: ts.ParameterDeclaration) =>
  ts.isIdentifier(parameter.name) ? Result.succeed(parameter.name.text) : Result.failVoid

const compositionParameterNames = (arrow: ts.ArrowFunction): ReadonlyArray<string> => {
  const currentNames = Array.filterMap(arrow.parameters, parameterNameText)

  const nestedNames = pipe(
    expressionFromConciseBody(arrow.body),
    Option.filter(ts.isArrowFunction),
    Option.filter(nestedSingleParamArrow),
    Option.map(compositionParameterNames),
    Option.getOrElse(Function.constant(emptyParameterNames))
  )

  return Array.appendAll(currentNames, nestedNames)
}

const referencesNonParameterOperation =
  (parameterNames: ReadonlyArray<string>) =>
  (expression: ts.Expression): boolean => {
    const referencesOperation = referencesNonParameterOperation(parameterNames)
    const unwrapped = unwrapTransparentExpression(expression)

    const isNonParameterIdentifier = (identifier: ts.Identifier) =>
      !Array.contains(parameterNames, identifier.text)

    const countPropertyAccessOperations = (access: ts.PropertyAccessExpression) =>
      referencesOperation(access.expression)

    return pipe(
      Match.value(unwrapped),
      Match.when(ts.isIdentifier, isNonParameterIdentifier),
      Match.when(ts.isPropertyAccessExpression, countPropertyAccessOperations),
      Match.when(ts.isCallExpression, (call) => {
        const calleeReferencesOperation = referencesOperation(call.expression)
        const argumentReferencesOperation = Array.some(call.arguments, referencesOperation)
        const checks = Array.make(calleeReferencesOperation, argumentReferencesOperation)

        return Array.some(checks, Boolean)
      }),
      Match.orElse(Function.constFalse)
    )
  }

const isCompositionForwarder = (arrow: ts.ArrowFunction) => {
  const parameterNames = compositionParameterNames(arrow)

  return pipe(
    finalCompositionCall(arrow),
    Option.filter(isAllowedCompositionExpression),
    Option.exists(referencesNonParameterOperation(parameterNames))
  )
}

const compositionForwarderElements =
  (index: ExportReferenceIndex) =>
  (context: MatchContext): ReadonlyArray<MatcherMatch<CompositionForwarderData>> => {
    if (isTestSourceFile(context.workspaceRoot)(context.sourceFile)) {
      return Array.empty()
    }

    const entryInSourceFile = flow(
      Struct.get<ExportedFunctionEntry, "nameNode">("nameNode"),
      (nameNode) => nameNode.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    const detectionForEntry = (entry: ExportedFunctionEntry) =>
      pipe(
        Option.liftPredicate(ts.isArrowFunction)(entry.functionNode),
        Option.filter(isCompositionForwarder),
        Option.map((arrow) => {
          const usage = usageFor(index)(entry)

          const stepCount = pipe(
            finalCompositionCall(arrow),
            Option.map(callExpressionCount),
            Option.getOrElse(Function.constant(0))
          )

          const data = CompositionForwarderData.make({
            exportName: entry.nameNode.text,
            stepCount,
            callerCount: usage.productionCallCount,
            callerPaths: usage.productionPaths,
            hasNonCallReference: usage.hasProductionNonCallReference
          })

          return makeNodeMatch(entry.nameNode, data)
        }),
        Result.fromOption(Function.constVoid)
      )

    return pipe(index.entries, Array.filter(entryInSourceFile), Array.filterMap(detectionForEntry))
  }

const compositionForwarderSubscriptions = Function.compose(
  compositionForwarderElements,
  fileSubscriptions
)

export const compositionForwarders = evidenceMatcher(exportReferenceIndex)(
  compositionForwarderSubscriptions
)
