import { Array, Function, Match, Option, Struct, pipe, Result } from "effect"
import * as ts from "typescript"

import { fileSubscriptions, makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"

import { CompositionForwarderData } from "./data.js"
import {
  ExportReferenceIndex,
  type ExportedFunctionEntry,
  isTestSourceFile,
  usageFor
} from "./programSymbols.js"
import { evidenceCheck, exportReferenceIndex } from "./architectureEvidence.js"
import { isExpressionBody, unwrapTransparentExpression } from "../support/tsNode.js"
import { makeSilentCheck } from "../../defineCheck.js"
import { compositionForwardersName } from "./names.js"

const message =
  "Composition forwarder evidence — this export threads parameters through a pipe or call chain without policy."

const hint =
  "Use caller count in Architecture Explore Advice: delete low-leverage indirection, but keep operations whose behaviour or naming would otherwise reappear across callers."

const emptyParameterNames: ReadonlyArray<string> = Array.empty()

const expressionFromConciseBody = (body: ts.ConciseBody) => {
  const expressionBody = pipe(
    Option.some(body),
    Option.filter(isExpressionBody),
    Option.map(unwrapTransparentExpression)
  )

  const singleStatementBlock = (block: ts.Block) => block.statements.length === 1

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

const nestedSingleParamArrow = (arrow: ts.ArrowFunction) => arrow.parameters.length === 1

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
  (context: CheckContext): ReadonlyArray<Detection> => {
    if (isTestSourceFile(context.workspaceRoot)(context.sourceFile)) {
      return Array.empty()
    }

    const element = makeDetection(context)

    const entryInSourceFile = (entry: ExportedFunctionEntry) =>
      entry.nameNode.getSourceFile() === context.sourceFile

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

          return element({
            node: entry.nameNode,
            message,
            hint,
            data
          })
        }),
        Result.fromOption(Function.constVoid)
      )

    return pipe(index.entries, Array.filter(entryInSourceFile), Array.filterMap(detectionForEntry))
  }

const compositionForwarderSubscriptions = Function.compose(
  compositionForwarderElements,
  fileSubscriptions
)

const compositionForwarderCheck = evidenceCheck(exportReferenceIndex)(
  compositionForwarderSubscriptions
)

export const compositionForwarders = makeSilentCheck(
  compositionForwardersName,
  compositionForwarderCheck
)
