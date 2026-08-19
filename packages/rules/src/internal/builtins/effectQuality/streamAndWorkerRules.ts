import { Array, Match as EffectMatch, Function, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { enclosingFunctionLike } from "../../support/effectApi/enclosingFunctionLike.js"
import { hasEffectCallAncestor } from "../../support/effectApi/hasEffectCallAncestor.js"
import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"
import type { ImportedMember } from "../../support/effectApi/importedMember.js"
import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"
import { propertyAssignmentNamed } from "../../support/effectApi/propertyAssignments.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { ancestorMatching } from "./ancestorMatching.js"
import { apiSubject } from "./apiSubject.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import {
  callArgumentAt,
  callOrPipeStageSubject,
  effectApiCall,
  effectApiReference,
  isExpressionReferenceNode
} from "./effectApiFacts.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

const objectLiteralArgument = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isObjectLiteralExpression)
)

const layerAcquisitionNames = Array.make("effect", "effectDiscard", "effectContext")

const cacheMakeNames = Array.make("make", "makeWith")

const runCollectNames = Array.of("runCollect")

const bufferNames = Array.of("buffer")

const capacityNames = Array.of("capacity")

const stringLiteralText = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isStringLiteralLike),
  Option.map(Struct.get("text"))
)

const unboundedStreamCollectFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      callOrPipeStageSubject(context.checker)("Stream")(runCollectNames)(node),
      Option.map(makeSubjectMatch("Stream.runCollect")),
      Option.toArray
    )

const capacityPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
  pipe(propertyAssignmentNamed(capacityNames)(object), Option.filter(ts.isPropertyAssignment))

const bufferCapacityIsUnbounded = (expression: ts.Expression) =>
  pipe(
    objectLiteralArgument(expression),
    Option.flatMap(capacityPropertyAssignment),
    Option.map(Struct.get("initializer")),
    Option.flatMap(stringLiteralText),
    Option.contains("unbounded")
  )

const unboundedBufferOptions = (call: ts.CallExpression) => {
  const direct = pipe(callArgumentAt(0)(call), Option.exists(bufferCapacityIsUnbounded))
  const dataFirst = pipe(callArgumentAt(1)(call), Option.exists(bufferCapacityIsUnbounded))

  return direct || dataFirst
}

const unboundedStreamBufferFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesBuffer = effectApiCall(context.checker)("Stream")(bufferNames)

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesBuffer),
      Option.filter(unboundedBufferOptions),
      Option.map(makeSubjectMatch('Stream.buffer({ capacity: "unbounded" })')),
      Option.toArray
    )
  }

const foreverNames = Array.of("forever")

const forkScopedNames = Array.of("forkScoped")

const streamRunNames = Array.make("runCollect", "runDrain", "runForEach", "runFold", "runFoldWhile")

const expressionContainsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const onCall = effectApiCall(checker)(namespace)(names)
    const onReference = effectApiReference(checker)(namespace)(names)

    const visitNode = (current: ts.Node) =>
      pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isCallExpression, onCall),
        EffectMatch.when(isExpressionReferenceNode, onReference),
        EffectMatch.orElse(Function.constFalse)
      )

    const step = (found: boolean) => (current: ts.Node) => (found ? true : visitNode(current))

    const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      step(found)(current)
    )

    return foldAst(uncurriedStep)(expression)(false)
  }

const lastImportedMemberPath = (value: ImportedMember) => Array.last(value.path)

const layerAcquisitionEffectArgument =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const matchesAcquisition = effectApiCall(checker)("Layer")(layerAcquisitionNames)

    if (!matchesAcquisition(call)) {
      return Option.none()
    }

    const callee = unwrapCallee(call.expression)
    const member = importedMemberAt(checker)(callee)
    const calleeMember = pipe(member, Option.flatMap(lastImportedMemberPath))
    const isEffectDual = Option.contains(calleeMember, "effect")

    if (isEffectDual) {
      return call.arguments.length >= 2 ? callArgumentAt(1)(call) : callArgumentAt(0)(call)
    }

    return callArgumentAt(0)(call)
  }

const acquisitionIsUnforkedForever = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const contains = expressionContainsEffectApi(checker)
  const hasFork = contains("Effect")(forkScopedNames)(expression)
  const lacksFork = !hasFork
  const hasForever = contains("Effect")(foreverNames)(expression)
  const hasStreamForever = contains("Stream")(foreverNames)(expression)
  const hasStreamRun = contains("Stream")(streamRunNames)(expression)
  const foreverStreamRun = hasStreamForever && hasStreamRun
  const hasForeverLike = hasForever || foreverStreamRun

  return lacksFork && hasForeverLike
}

const layerForeverFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    layerAcquisitionEffectArgument(checker)(call),
    Option.filter(acquisitionIsUnforkedForever(checker)),
    Option.map(() => makeSubjectMatch("Layer.effect")(call))
  )

const layerForeverAcquisitionFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      callExpressionOf(node),
      Option.flatMap(layerForeverFinding(context.checker)),
      Option.toArray
    )

const ignoreEffectNames = Array.make("ignore", "ignoreCause")

const foreverEffectNames = Array.of("forever")

const scopedForkNames = Array.make("forkScoped", "forkIn")

const unscopedForkNames = Array.make("forkChild", "forkDetach", "forkDaemon")

const layerEffectNames = Array.make("effect", "effectDiscard", "scoped", "scopedDiscard")

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
    const consoleLog = strictEqual("console")(receiverName)
    const loggerMethod = Array.contains(loggerMethodNames, expression.name.text)
    const consoleParts = Array.make(consoleLog, loggerMethod)
    const consoleLogger = Array.every(consoleParts, Boolean)
    const signals = Array.make(consoleLogger, loggerMethod)

    return Array.some(signals, Boolean)
  }

  const isIdentifier = ts.isIdentifier(expression)

  return isIdentifier ? Array.contains(bareLoggerNames, expression.text) : isIdentifier
}

const hasNearbyLogging = (node: ts.Node) => {
  const reducer = (found: boolean) => (current: ts.Node) => {
    const hasLogging = loggingCallNode(current)
    const signals = Array.make(found, hasLogging)

    return Array.some(signals, Boolean)
  }

  const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    reducer(found)(current)
  )

  const scan = Function.flip(foldAst(uncurriedReducer))(false)

  return pipe(enclosingFunctionLike(node), Option.exists(scan))
}

const fiberSetRunNames = Array.make("run", "add", "makeRuntime")

const fiberMapRunNames = Array.make("run", "set", "makeRuntime")

const fiberCollectionSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const fiberSet = importedEffectApiAt(checker)("FiberSet")(cacheMakeNames)(call.expression)
  const fiberMap = importedEffectApiAt(checker)("FiberMap")(cacheMakeNames)(call.expression)
  const fiberSetRun = importedEffectApiAt(checker)("FiberSet")(fiberSetRunNames)(call.expression)
  const fiberMapRun = importedEffectApiAt(checker)("FiberMap")(fiberMapRunNames)(call.expression)

  return Array.make(fiberSet, fiberMap, fiberSetRun, fiberMapRun)
}

const hasScopedBackgroundAncestor = (checker: ts.TypeChecker) => (node: ts.Node) => {
  const forkScoped = hasEffectCallAncestor(checker)("Effect")(scopedForkNames)(node)

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

const isLayerAcquisitionContext = (checker: ts.TypeChecker) =>
  hasEffectCallAncestor(checker)("Layer")(layerEffectNames)

const streamRunForeverNames = Array.make("runForEach", "runDrain", "runFold")

const scopedBackgroundWorkCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const layerAcquisition = isLayerAcquisitionContext(context.checker)(node)

    if (layerAcquisition) {
      return noSubjectMatches
    }

    const forever = callIsEffectApi(context.checker)("Effect")(foreverEffectNames)(node)
    const unscopedFork = callIsEffectApi(context.checker)("Effect")(unscopedForkNames)(node)
    const streamRun = callIsEffectApi(context.checker)("Stream")(streamRunForeverNames)(node)
    const underForever = hasEffectCallAncestor(context.checker)("Effect")(foreverEffectNames)(node)
    const streamRunForeverParts = Array.make(streamRun, underForever)
    const streamRunForever = Array.every(streamRunForeverParts, Boolean)
    const candidates = Array.make(forever, unscopedFork, streamRunForever)
    const hasCandidate = Array.some(candidates, Boolean)
    const scopedAncestor = hasScopedBackgroundAncestor(context.checker)(node)
    const quiet = Array.make(!hasCandidate, scopedAncestor)

    if (Array.some(quiet, Boolean)) {
      return noSubjectMatches
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const observableWorkerFailureCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const notIgnore = !callIsEffectApi(context.checker)("Effect")(ignoreEffectNames)(node)
    const nearbyLogging = hasNearbyLogging(node)
    const skip = Array.make(notIgnore, nearbyLogging)

    if (Array.some(skip, Boolean)) {
      return noSubjectMatches
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const streamPaginateNames = Array.of("paginate")

const pageTokenPattern =
  /(?:pageToken|nextPageToken|nextCursor|cursor|continuation|pageKey|offset)/i

const pageTokenNode = (current: ts.Node) => {
  if (ts.isIdentifier(current)) {
    return pageTokenPattern.test(current.text)
  }

  const isStringLiteral = ts.isStringLiteralLike(current)

  return isStringLiteral ? pageTokenPattern.test(current.text) : isStringLiteral
}

const isPageTokenLoop = (node: ts.Node) => {
  const isWhile = ts.isWhileStatement(node)
  const isDo = ts.isDoStatement(node)
  const isFor = ts.isForStatement(node)
  const isLoop = Array.make(isWhile, isDo, isFor)
  const loopNode = Array.some(isLoop, Boolean)

  if (!loopNode) {
    return loopNode
  }

  const reducer = (found: boolean) => (current: ts.Node) => {
    const hasPageToken = pageTokenNode(current)
    const signals = Array.make(found, hasPageToken)

    return Array.some(signals, Boolean)
  }

  const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    reducer(found)(current)
  )

  return foldAst(uncurriedReducer)(node)(false)
}

const pageAccumulateMethods = Array.make("push", "concat", "append", "appendAll", "yield")

const propertyAccessNameText = flow(
  Struct.get<ts.PropertyAccessExpression, "name">("name"),
  Struct.get("text")
)

const accumulatesPageMethod = (access: ts.PropertyAccessExpression) => {
  const method = propertyAccessNameText(access)

  return Array.contains(pageAccumulateMethods, method)
}

const pageAccumulateNode = (current: ts.Node) => {
  if (!ts.isCallExpression(current)) {
    return ts.isYieldExpression(current)
  }

  const propertyCallee = Option.liftPredicate(ts.isPropertyAccessExpression)(current.expression)

  return Option.exists(propertyCallee, accumulatesPageMethod)
}

const loopAccumulatesPages = (node: ts.Node) => {
  const reducer = (found: boolean) => (current: ts.Node) => {
    const accumulates = pageAccumulateNode(current)
    const signals = Array.make(found, accumulates)

    return Array.some(signals, Boolean)
  }

  const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    reducer(found)(current)
  )

  return foldAst(uncurriedReducer)(node)(false)
}

const streamPaginationCandidates =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const pageTokenLoop = isPageTokenLoop(node)
    const accumulates = loopAccumulatesPages(node)
    const eligible = Array.make(pageTokenLoop, accumulates)

    if (!Array.every(eligible, Boolean)) {
      return noSubjectMatches
    }

    // Stay quiet when Stream.paginate is already chosen because the preferred API is present.
    const usesPaginateStep = (found: boolean) => (current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isPaginateCall =
        isCall && callIsEffectApi(context.checker)("Stream")(streamPaginateNames)(current)

      const signals = Array.make(found, isPaginateCall)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      usesPaginateStep(found)(current)
    )

    const scan = Function.flip(foldAst(uncurriedReducer))(false)
    const usesPaginate = pipe(enclosingFunctionLike(node), Option.exists(scan))

    if (usesPaginate) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("page-token loop")(node)

    return Array.of(finding)
  }

const runtimeKinds = Array.make(
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.DeleteExpression,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.ForStatement
)

const callKinds = Array.of(ts.SyntaxKind.CallExpression)

const paginationKinds = Array.make(
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.ForStatement
)

const unboundedStreamCollectScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  unboundedStreamCollectFindings
)

export const unboundedStreamCollect = makeRule("unbounded-stream-collect")(
  unboundedStreamCollectScanner
)(
  fixedRuleMessage(
    "Avoid collecting an unbounded production Stream.",
    "Consume the stream incrementally with runForEach, runDrain, or a bounded take."
  )
)

const unboundedStreamBufferScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  unboundedStreamBufferFindings
)

export const unboundedStreamBuffer = makeRule("unbounded-stream-buffer")(
  unboundedStreamBufferScanner
)(
  fixedRuleMessage(
    "Avoid unbounded Stream buffers.",
    "Use natural backpressure or a bounded buffer strategy."
  )
)

const layerForeverAcquisitionScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  layerForeverAcquisitionFindings
)

export const layerForeverAcquisition = makeRule("layer-forever-acquisition")(
  layerForeverAcquisitionScanner
)(
  fixedRuleMessage(
    "Fork long-lived work into the layer scope so acquisition completes.",
    "Run the worker with Effect.forkScoped, FiberSet, or FiberMap."
  )
)

const scopedBackgroundWorkScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  scopedBackgroundWorkCandidates
)

export const scopedBackgroundWork = makeRule("scoped-background-work")(scopedBackgroundWorkScanner)(
  fixedRuleMessage(
    "Scope background work.",
    "Own worker lifetime in a Layer and fork it into that scope."
  )
)

const observableWorkerFailureScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  observableWorkerFailureCandidates
)

export const observableWorkerFailure = makeRule("observable-worker-failure")(
  observableWorkerFailureScanner
)(
  fixedRuleMessage(
    "Make worker failures observable.",
    "Log expected item failures or make the skip policy explicit at the owning worker boundary."
  )
)

const streamPaginationScanner = makeNodeScanner(paginationKinds)(acceptsNode)(
  streamPaginationCandidates
)

export const streamPagination = makeRule("stream-pagination")(streamPaginationScanner)(
  fixedRuleMessage(
    "Prefer Stream.paginate.",
    "Use Stream.paginate for an effectful token-based page source."
  )
)
