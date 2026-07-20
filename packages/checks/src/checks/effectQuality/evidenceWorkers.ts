import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import {
  enclosingFunctionLike,
  hasEffectCallAncestor,
  importedEffectApiAt
} from "../functionalCoreEffect/support.js"
import { ancestorMatching } from "./astQueries.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import {
  apiSubject,
  cacheMakeNames,
  callIsEffectApi,
  isProductionRole,
  newMapBindingName
} from "./evidenceSupport.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const ignoreEffectNames = Array.make("ignore", "ignoreCause")

const foreverEffectNames = Array.of("forever")

const forkScopedNames = Array.make("forkScoped", "forkIn")

const unscopedForkNames = Array.make("forkChild", "forkDetach", "forkDaemon")

const layerEffectNames = Array.make("effect", "effectDiscard", "scoped", "scopedDiscard")

const fiberTypeNamePattern = /Fiber/i

const loggerMethodNames = Array.make("log", "info", "warn", "error", "debug", "trace", "fatal")

const bareLoggerNames = Array.make("log", "info", "warn", "error", "debug", "trace")

const loggingCallNode = (current: ts.Node) => {
  const isCall = ts.isCallExpression(current)

  if (!isCall) {
    return isCall
  }

  const expression = unwrapTransparentExpression(current.expression)

  if (ts.isPropertyAccessExpression(expression)) {
    const receiver = unwrapTransparentExpression(expression.expression)
    const receiverName = ts.isIdentifier(receiver) ? receiver.text : ""
    const method = expression.name.text
    const consoleLog = strictEqual(receiverName, "console")
    const loggerMethod = Array.contains(loggerMethodNames, method)
    const consoleParts = Array.make(consoleLog, loggerMethod)
    const consoleLogger = Array.every(consoleParts, Boolean)
    const signals = Array.make(consoleLogger, loggerMethod)

    return Array.some(signals, Boolean)
  }

  const isIdentifier = ts.isIdentifier(expression)

  return isIdentifier ? Array.contains(bareLoggerNames, expression.text) : isIdentifier
}

const hasNearbyLogging = (node: ts.Node) => {
  const reducer = (found: boolean, current: ts.Node) => {
    const hasLogging = loggingCallNode(current)
    const signals = Array.make(found, hasLogging)

    return Array.some(signals, Boolean)
  }

  const scan = Function.flip(foldAst(reducer))(false)

  return pipe(enclosingFunctionLike(node), Option.exists(scan))
}

const fiberSetRunNames = Array.make("run", "add", "makeRuntime")
const fiberMapRunNames = Array.make("run", "set", "makeRuntime")

const fiberCollectionSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const fiberSet = importedEffectApiAt(checker, call.expression, "FiberSet", cacheMakeNames)
  const fiberMap = importedEffectApiAt(checker, call.expression, "FiberMap", cacheMakeNames)
  const fiberSetRun = importedEffectApiAt(checker, call.expression, "FiberSet", fiberSetRunNames)
  const fiberMapRun = importedEffectApiAt(checker, call.expression, "FiberMap", fiberMapRunNames)

  return Array.make(fiberSet, fiberMap, fiberSetRun, fiberMapRun)
}

const hasScopedBackgroundAncestor = (checker: ts.TypeChecker) => (node: ts.Node) => {
  const forkScoped = hasEffectCallAncestor(checker, node, "Effect", forkScopedNames)

  const fiberCollection = pipe(
    ancestorMatching(ts.isCallExpression)(node),
    Option.exists((call) => {
      const signals = fiberCollectionSignals(checker)(call)

      return Array.some(signals, Boolean)
    })
  )

  const signals = Array.make(forkScoped, fiberCollection)

  return Array.some(signals, Boolean)
}

const isLayerAcquisitionContext = (checker: ts.TypeChecker) => (node: ts.Node) =>
  hasEffectCallAncestor(checker, node, "Layer", layerEffectNames)

const streamRunForeverNames = Array.make("runForEach", "runDrain", "runFold")

export const scopedBackgroundWork =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    // Layer forever acquisition is a reported rule because that shape is owned elsewhere.
    const layerAcquisition = isLayerAcquisitionContext(context.checker)(node)
    const skip = Array.make(testRole, nonProduction, layerAcquisition)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const forever = callIsEffectApi(context.checker)("Effect")(foreverEffectNames)(node)
    const unscopedFork = callIsEffectApi(context.checker)("Effect")(unscopedForkNames)(node)
    const streamRun = callIsEffectApi(context.checker)("Stream")(streamRunForeverNames)(node)
    const underForever = hasEffectCallAncestor(context.checker, node, "Effect", foreverEffectNames)
    const streamRunForeverParts = Array.make(streamRun, underForever)
    const streamRunForever = Array.every(streamRunForeverParts, Boolean)
    const candidates = Array.make(forever, unscopedFork, streamRunForever)
    const hasCandidate = Array.some(candidates, Boolean)
    const scopedAncestor = hasScopedBackgroundAncestor(context.checker)(node)
    const quiet = Array.make(!hasCandidate, scopedAncestor)

    if (Array.some(quiet, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("scoped-background-work")(subject)(node.expression)

    return Array.of(finding)
  }

const fiberMapNames = Array.make("make", "set", "run")

const keyedMapNamePattern = /fiber|workers|inflight|running|keyed/i

const keyedReceiverPattern = /map|fibers|workers|inflight|running|keyed/i

const forkValueNames = Array.make("forkChild", "forkScoped", "forkDetach", "forkIn", "forkDaemon")

export const keyedStreamWork =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const skip = Array.make(testRole, nonProduction)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const callIsFiberMapApi = (call: ts.CallExpression) =>
      importedEffectApiAt(context.checker, call.expression, "FiberMap", fiberMapNames)

    const usesFiberMap = pipe(
      Option.liftPredicate(ts.isCallExpression)(node),
      Option.exists(callIsFiberMapApi)
    )

    // FiberMap is the preferred helper because its legitimate use should not be advised.
    if (usesFiberMap) {
      return emptyAdviceFindings
    }

    if (ts.isNewExpression(node)) {
      return pipe(
        newMapBindingName(node),
        Option.filter((name) => keyedMapNamePattern.test(name)),
        Option.map((name) => {
          const subject = `new Map (${name})`

          return makeAdviceFinding("keyed-stream-work")(subject)(node.expression)
        }),
        Option.map(Array.of),
        Option.getOrElse(Function.constant(emptyAdviceFindings))
      )
    }

    if (!ts.isCallExpression(node)) {
      return emptyAdviceFindings
    }

    const expression = unwrapTransparentExpression(node.expression)
    const isPropertyAccess = ts.isPropertyAccessExpression(expression)

    if (!isPropertyAccess) {
      return emptyAdviceFindings
    }

    const isSetName = strictEqual(expression.name.text, "set")

    if (!isSetName) {
      return emptyAdviceFindings
    }

    const valueOption = Option.fromNullishOr(node.arguments[1])

    if (Option.isNone(valueOption)) {
      return emptyAdviceFindings
    }

    const value = valueOption.value
    const valueExpression = unwrapTransparentExpression(value)

    const forksEffect = pipe(
      Option.liftPredicate(ts.isCallExpression)(valueExpression),
      Option.exists(callIsEffectApi(context.checker)("Effect")(forkValueNames))
    )

    const valueText = value.getText()
    const valueMentionsFiber = fiberTypeNamePattern.test(valueText)
    const receiver = unwrapTransparentExpression(expression.expression)
    const receiverName = ts.isIdentifier(receiver) ? receiver.text : receiver.getText()
    const mapishReceiver = keyedReceiverPattern.test(receiverName)
    const fiberishValue = Array.make(forksEffect, valueMentionsFiber)
    const hasFiberishValue = Array.some(fiberishValue, Boolean)
    const emitParts = Array.make(mapishReceiver, hasFiberishValue)
    const emit = Array.every(emitParts, Boolean)

    if (emit) {
      const subject = `${receiverName}.set`
      const finding = makeAdviceFinding("keyed-stream-work")(subject)(node.expression)

      return Array.of(finding)
    }

    return emptyAdviceFindings
  }

export const observableWorkerFailure =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const notIgnore = !callIsEffectApi(context.checker)("Effect")(ignoreEffectNames)(node)
    const nearbyLogging = hasNearbyLogging(node)
    const skip = Array.make(testRole, nonProduction, notIgnore, nearbyLogging)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("observable-worker-failure")(subject)(node.expression)

    return Array.of(finding)
  }
