import {
  Array,
  Function,
  Option,
  Result,
  Schema,
  Struct,
  flow,
  pipe,
  Match as EffectMatch
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { isTestSourceFile } from "./architectureExplore/isTestPath.js"
import type { ExportReferenceIndex } from "./architectureExplore/exportReferenceIndex.js"
import type { ExportedFunctionEntry } from "./architectureExplore/exportedFunctionEntry.js"
import { usageFor } from "./architectureExplore/usageFor.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { expressionFromConciseBody } from "./expressionFromConciseBody.js"
import { nestedSingleParamArrow } from "./nestedSingleParamArrow.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match as MatcherMatch } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"

import { stringArray } from "./architectureExplore/stringArraySchema.js"
import { exportReferenceFileMatcher } from "./exportReferenceFileMatcher.js"

// CompositionForwarderData is curried pipe-wrapper evidence because exact forwarding misses FP.
export const CompositionForwarderData = Schema.Struct({
  exportName: Schema.String,
  stepCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
})

export interface CompositionForwarderData extends Schema.Schema.Type<
  typeof CompositionForwarderData
> {}

const emptyParameterNames: ReadonlyArray<string> = Array.empty()

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
    EffectMatch.value,
    EffectMatch.when(ts.isIdentifier, Function.constTrue),
    EffectMatch.when(ts.isPropertyAccessExpression, (access) => {
      const propertyNameIsIdentifier = ts.isIdentifier(access.name)
      const receiverAllowed = isAllowedCompositionExpression(access.expression)
      const checks = Array.make(propertyNameIsIdentifier, receiverAllowed)

      return Array.every(checks, Boolean)
    }),
    EffectMatch.when(ts.isCallExpression, (call) => {
      const calleeAllowed = isAllowedCompositionExpression(call.expression)
      const argumentsAllowed = Array.every(call.arguments, isAllowedCompositionExpression)
      const checks = Array.make(calleeAllowed, argumentsAllowed)

      return Array.every(checks, Boolean)
    }),
    EffectMatch.orElse(Function.constFalse)
  )

// Forwarder stepCount counts only CallExpressions because fingerprints also count pipe/flow stages.
const countPropertyAccessCalls = (access: ts.PropertyAccessExpression) =>
  callExpressionCount(access.expression)

const callExpressionCount = (expression: ts.Expression): number =>
  pipe(
    expression,
    unwrapTransparentExpression,
    EffectMatch.value,
    EffectMatch.when(ts.isCallExpression, (call) => {
      const nestedInCallee = callExpressionCount(call.expression)

      const nestedInArguments = Array.reduce(
        call.arguments,
        0,
        (total, argument) => total + callExpressionCount(argument)
      )

      return 1 + nestedInCallee + nestedInArguments
    }),
    EffectMatch.when(ts.isPropertyAccessExpression, countPropertyAccessCalls),
    EffectMatch.orElse(Function.constant(0))
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
      EffectMatch.value(unwrapped),
      EffectMatch.when(ts.isIdentifier, isNonParameterIdentifier),
      EffectMatch.when(ts.isPropertyAccessExpression, countPropertyAccessOperations),
      EffectMatch.when(ts.isCallExpression, (call) => {
        const calleeReferencesOperation = referencesOperation(call.expression)
        const argumentReferencesOperation = Array.some(call.arguments, referencesOperation)
        const checks = Array.make(calleeReferencesOperation, argumentReferencesOperation)

        return Array.some(checks, Boolean)
      }),
      EffectMatch.orElse(Function.constFalse)
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

export const compositionForwarders = exportReferenceFileMatcher(compositionForwarderElements)
