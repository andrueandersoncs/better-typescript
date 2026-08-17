import {
  Array,
  Function,
  Option,
  Predicate,
  Struct,
  flow,
  pipe,
  Match as EffectMatch
} from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"

import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"

import type { Match } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"

import { foldAst } from "../../sources/foldAst.js"

import type { ArchitectureRole } from "../../support/architectureRoleType.js"

import { callExpressionOf } from "../../support/callExpressionOf.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { isAdapterOrRootRole } from "../functionalCoreEffect/adapterRootRoles.js"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

import { enclosingFunctionLike } from "../functionalCoreEffect/enclosingFunctionLike.js"

import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

import { hasEffectCallAncestor } from "../functionalCoreEffect/hasEffectCallAncestor.js"

import { ancestorMatching } from "./ancestorMatching.js"

import { apiSubject } from "./apiSubject.js"

import { backoffScheduleNames } from "./backoffScheduleNames.js"

import { calleeMethodName } from "./calleeMethodName.js"

import { catchCauseNames } from "./catchCauseNames.js"

import { callIsEffectApi } from "./callIsEffectApi.js"

import { callIsResponseJson } from "./effectIdentity.js"

import { EffectQualityAdviceData } from "./effectQualityAdviceData.js"

import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"

import { EffectQualityIndex } from "./effectQualityIndex.js"
import { makeEffectQualityMatcher } from "./buildEffectQualityIndex.js"

import { emptyAdviceFindings } from "./emptyAdviceFindings.js"

import { enclosingFunctionName } from "./enclosingFunctionName.js"

import { cachePreference } from "./evidenceCache.js"

import { expressionTreeHasEffectApi } from "./expressionTreeHasEffectApi.js"

import { isAdapterRole } from "./isAdapterRole.js"

import { isBareFetchCall } from "./isAmbientFetchCallee.js"

import { isFetchHttpClientMember } from "./isFetchHttpClientMember.js"

import { isHttpClientMember } from "./isHttpClientMember.js"

import { isInsideNamedCallback } from "./isInsideNamedCallback.js"

import { isRootRole } from "./isRootRole.js"

import { isTestClockMember } from "./isTestClockMember.js"

import { isTestRole } from "./isTestRole.js"

import { keyedStreamWork } from "./keyedStreamWork.js"

import { makeAdviceFinding } from "./makeAdviceFinding.js"

import { memberLastName } from "./memberLastName.js"

import { callLooksLikeNetworkClient } from "./networkMethodNames.js"

import { isProductionRole } from "./productionRoles.js"

import { publicQueue } from "./publicQueue.js"

import { relativeSourcePath } from "./relativeSourcePath.js"

import { retryEffectNames } from "./retryEffectNames.js"

import { roleForSourceFile } from "./roleForSourceFile.js"

import { schemaDecodeNames } from "./schemaDecodeNames.js"

import { stringLiteralArgument } from "./stringLiteralArgument.js"

const cacheMakeNames = Array.make("make", "makeWith")

const findingWhen =
  (shouldEmit: boolean) =>
  (finding: EffectQualityAdviceFinding): ReadonlyArray<EffectQualityAdviceFinding> =>
    shouldEmit ? Array.of(finding) : emptyAdviceFindings

const configStringNames = Array.of("string")

const configRefinedNames = Array.make("schema", "mapOrFail", "url", "port", "int", "boolean")

const jitterScheduleNames = Array.of("jittered")

const refinedConfigKeyPattern =
  /(?:path|dir|directory|folder|url|uri|host|hostname|endpoint|base[_-]?url|port|id|uuid|identifier|slug|email)$/i

const mutationOperationPattern =
  /^(create|insert|update|upsert|delete|remove|write|save|put|post|patch|send|publish|enqueue|dispatch|mutate)/i

const scheduleHasBackoff = (checker: ts.TypeChecker) =>
  expressionTreeHasEffectApi(checker)("Schedule")(backoffScheduleNames)

const scheduleHasJitter = (checker: ts.TypeChecker) =>
  expressionTreeHasEffectApi(checker)("Schedule")(jitterScheduleNames)

const retryScheduleArgument = (node: ts.CallExpression) => {
  const hasScheduleSlot = node.arguments.length >= 2
  const hasSingleArgument = strictEqual(1)(node.arguments.length)

  if (hasScheduleSlot) {
    return Option.fromNullishOr(node.arguments[1])
  }

  return hasSingleArgument ? Option.fromNullishOr(node.arguments[0]) : Option.none()
}

const operationNameNear = (node: ts.Node) =>
  pipe(enclosingFunctionName(node), Option.getOrElse(Function.constant("")))

const configRefinedValues =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (isTestRole(role)) {
      return emptyAdviceFindings
    }

    const isConfigString = callIsEffectApi(context.checker)("Config")(configStringNames)(node)

    if (!isConfigString) {
      return emptyAdviceFindings
    }

    // Sensitive keys belong to config-secret-redaction because that rule owns redaction shape.
    const key = pipe(stringLiteralArgument(0)(node), Option.getOrElse(Function.constant("")))
    const hasKey = key.length > 0
    const matchesRefinedKey = refinedConfigKeyPattern.test(key)
    const refinedParts = Array.make(hasKey, matchesRefinedKey)
    const refinedShape = Array.every(refinedParts, Boolean)

    const alreadyRefinedParent = hasEffectCallAncestor(
      context.checker,
      node,
      "Config",
      configRefinedNames
    )

    const subject = hasKey ? `Config.string(${JSON.stringify(key)})` : "Config.string"
    const notAlreadyRefined = !alreadyRefinedParent
    const shouldEmitParts = Array.make(refinedShape, notAlreadyRefined)
    const shouldEmit = Array.every(shouldEmitParts, Boolean)
    const finding = makeAdviceFinding("config-refined-values")(subject)(node.expression)

    return findingWhen(shouldEmit)(finding)
  }

const retryWithoutJitter =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (isTestRole(role)) {
      return emptyAdviceFindings
    }

    const isRetry = callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)

    if (!isRetry) {
      return emptyAdviceFindings
    }

    const subject = apiSubject(context)("Effect.retry")(node.expression)
    const finding = makeAdviceFinding("retry-without-jitter")(subject)(node.expression)

    return pipe(
      retryScheduleArgument(node),
      Option.filter(scheduleHasBackoff(context.checker)),
      Option.filter(Predicate.not(scheduleHasJitter(context.checker))),
      Option.map(Function.constant(finding)),
      Option.map(Array.of),
      Option.getOrElse(Function.constant(emptyAdviceFindings))
    )
  }

const idempotentRetry =
  (context: MatchContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const notRetry = !callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)
    const skip = Array.make(testRole, nonProduction, notRetry)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const operation = operationNameNear(node)
    const missingOperation = strictEqual(0)(operation.length)
    const alreadyIdempotent = index.policy.idempotentOperation(operation)
    const notMutation = !mutationOperationPattern.test(operation)
    const quiet = Array.make(missingOperation, alreadyIdempotent, notMutation)

    if (Array.some(quiet, Boolean)) {
      return emptyAdviceFindings
    }

    const api = apiSubject(context)("Effect.retry")(node.expression)
    const subject = `${api} (${operation})`
    const finding = makeAdviceFinding("idempotent-retry")(subject)(node.expression)

    return Array.of(finding)
  }

const rawFetchOutsideAdapter =
  (context: MatchContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (!isBareFetchCall(context.checker)(node)) {
      return emptyAdviceFindings
    }

    const adapterOrRoot = isAdapterOrRootRole(role)
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const relative = relativeSourcePath(index)(context.sourceFile)
    const exception = index.policy.rawFetchException(relative)
    const skipRoles = Array.make(adapterOrRoot, testRole, nonProduction, exception)

    if (Array.some(skipRoles, Boolean)) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("raw-fetch-outside-adapter")("fetch")(node.expression)

    return Array.of(finding)
  }

const httpClientPreference =
  (context: MatchContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Prefer Effect HttpClient inside adapters because outside-adapter raw fetch is separate adv...
    const notAdapter = !isAdapterRole(role)
    const notBareFetch = !isBareFetchCall(context.checker)(node)
    const skip = Array.make(notAdapter, notBareFetch)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const relative = relativeSourcePath(index)(context.sourceFile)

    if (index.policy.rawFetchException(relative)) {
      return emptyAdviceFindings
    }

    // Quiet when the file already wires HttpClient because preference is already met.
    const memberUsesHttpClient = (member: ImportedMember) => {
      const http = isHttpClientMember(member)
      const fetchHttp = isFetchHttpClientMember(member)
      const members = Array.make(http, fetchHttp)

      return Array.some(members, Boolean)
    }

    const expressionUsesHttpClient = (expression: ts.Expression) =>
      pipe(importedMemberAt(context.checker, expression), Option.exists(memberUsesHttpClient))

    const currentUsesHttpClient = (current: ts.Node) =>
      pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isIdentifier, expressionUsesHttpClient),
        EffectMatch.when(ts.isPropertyAccessExpression, expressionUsesHttpClient),
        EffectMatch.orElse(Function.constFalse)
      )

    const fileUsesHttpClientReducer = (found: boolean, current: ts.Node) => {
      const usesHttpClient = currentUsesHttpClient(current)
      const signals = Array.make(found, usesHttpClient)

      return Array.some(signals, Boolean)
    }

    const fileUsesHttpClient = foldAst(fileUsesHttpClientReducer)(context.sourceFile)(false)

    if (fileUsesHttpClient) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("http-client-preference")("fetch")(node.expression)

    return Array.of(finding)
  }

const handlerNamePattern = /(?:handler|route|controller|endpoint|resolve|loader|action)$/i

const transactionNamePattern =
  /(?:transaction|withTransaction|useTransaction|transact|inTransaction)/i

const persistenceMethodNames = Array.make(
  "query",
  "insert",
  "update",
  "delete",
  "upsert",
  "execute",
  "transaction",
  "withTransaction",
  "save",
  "write",
  "create",
  "remove"
)

const callLooksLikePersistence = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const methodName = calleeMethodName(expression)

  return Array.contains(persistenceMethodNames, methodName)
}

const isInsideTransactionCallback = (node: ts.Node) => {
  const named = isInsideNamedCallback(transactionNamePattern)(node)

  const callNamed = pipe(
    ancestorMatching(ts.isCallExpression)(node),
    Option.exists((call) => {
      const expression = unwrapTransparentExpression(call.expression)
      const method = calleeMethodName(expression)

      return transactionNamePattern.test(method)
    })
  )

  const signals = Array.make(named, callNamed)

  return Array.some(signals, Boolean)
}

const thinHttpHandlers =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Prefer adapter/application HTTP edges because composition roots own wiring.
    const isAdapter = strictEqual("adapter")(role)
    const isApplication = strictEqual("application")(role)
    const allowedRoles = Array.make(isAdapter, isApplication)
    const allowedRole = Array.some(allowedRoles, Boolean)
    const outsideHandler = !isInsideNamedCallback(handlerNamePattern)(node)
    const skip = Array.make(!allowedRole, outsideHandler)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    // FCE already reports non-root provide* because this check is about handler-local persistence.
    const persistence = callLooksLikePersistence(node)
    const networkCall = callLooksLikeNetworkClient(context)(node)
    const networkParts = Array.make(networkCall, isApplication)
    const networkInApplication = Array.every(networkParts, Boolean)
    const signals = Array.make(persistence, networkInApplication)

    if (!Array.some(signals, Boolean)) {
      return emptyAdviceFindings
    }

    const subject = node.expression.getText()
    const finding = makeAdviceFinding("thin-http-handlers")(subject)(node.expression)

    return Array.of(finding)
  }

const transactionNetworkWork =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const outsideTransaction = !isInsideTransactionCallback(node)
    const notNetwork = !callLooksLikeNetworkClient(context)(node)
    const skip = Array.make(testRole, nonProduction, outsideTransaction, notNetwork)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const subject = node.expression.getText()
    const finding = makeAdviceFinding("transaction-network-work")(subject)(node.expression)

    return Array.of(finding)
  }

const callIsJsonParse = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(expression)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const isParse = strictEqual("parse")(expression.name.text)
  const receiver = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(receiver)
  const receiverText = isIdentifier ? receiver.text : ""
  const isJsonName = strictEqual("JSON")(receiverText)
  const jsonParts = Array.make(isIdentifier, isJsonName)
  const jsonReceiver = Array.every(jsonParts, Boolean)
  const checks = Array.make(isParse, jsonReceiver)

  return Array.every(checks, Boolean)
}

const requestJsonAccess = (expression: ts.Expression) => {
  const access = unwrapTransparentExpression(expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(access)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const receiver = access.expression.getText()
  const isJsonMethod = strictEqual("json")(access.name.text)
  const looksLikeRequest = /request|req|body|payload|event/i.test(receiver)
  const checks = Array.make(isJsonMethod, looksLikeRequest)

  return Array.every(checks, Boolean)
}

const parentDecodesNode = (checker: ts.TypeChecker) => (parent: ts.Node) => {
  if (ts.isCallExpression(parent)) {
    return callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent)
  }

  const grandparentCall = ts.isCallExpression(parent.parent)

  return grandparentCall
    ? callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent.parent)
    : grandparentCall
}

const boundarySchemaDecode =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const responseJson = callIsResponseJson(node)
    const skip = Array.make(testRole, nonProduction, responseJson)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const jsonParse = callIsJsonParse(node)
    // request.json is boundary-shaped because it is not the HTTP response rule.
    const requestJson = requestJsonAccess(node.expression)
    const candidates = Array.make(jsonParse, requestJson)

    if (!Array.some(candidates, Boolean)) {
      return emptyAdviceFindings
    }

    // Quiet when decode is composed directly around this node because Schema already validates.
    const parentDecodes = pipe(
      Option.fromNullishOr(node.parent),
      Option.exists(parentDecodesNode(context.checker))
    )

    const nearbyDecodeReducer = (found: boolean, current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isDecodeCall =
        isCall && callIsEffectApi(context.checker)("Schema")(schemaDecodeNames)(current)

      const signals = Array.make(found, isDecodeCall)

      return Array.some(signals, Boolean)
    }

    const scan = Function.flip(foldAst(nearbyDecodeReducer))(false)
    const nearbyDecode = pipe(enclosingFunctionLike(node), Option.exists(scan))
    const alreadyDecoded = Array.make(parentDecodes, nearbyDecode)

    if (Array.some(alreadyDecoded, Boolean)) {
      return emptyAdviceFindings
    }

    const subject = jsonParse ? "JSON.parse" : node.expression.getText()
    const finding = makeAdviceFinding("boundary-schema-decode")(subject)(node.expression)

    return Array.of(finding)
  }

const timeEffectNames = Array.make(
  "sleep",
  "timeout",
  "timeoutTo",
  "timeoutFail",
  "timeoutFailCause"
)

const isTestClockApiAt =
  (checker: ts.TypeChecker) => (names: ReadonlyArray<string>) => (expression: ts.Expression) =>
    pipe(
      importedMemberAt(checker, expression),
      Option.exists((member) => {
        const name = memberLastName(member)
        const nameMatches = Array.contains(names, name)
        const isTestClock = isTestClockMember(member)
        const checks = Array.make(nameMatches, isTestClock)

        return Array.every(checks, Boolean)
      })
    )

const testClockNames = Array.make("adjust", "setTime", "withLive", "testClockWith", "layer", "make")

const testClockReferenceNode = (checker: ts.TypeChecker) => (current: ts.Node) => {
  const isIdentifier = ts.isIdentifier(current)
  const isPropertyAccess = ts.isPropertyAccessExpression(current)
  const referenceKinds = Array.make(isIdentifier, isPropertyAccess)

  if (Array.some(referenceKinds, Boolean)) {
    return pipe(
      importedMemberAt(checker, current as ts.Expression),
      Option.exists(isTestClockMember)
    )
  }

  const isCall = ts.isCallExpression(current)

  return isCall ? isTestClockApiAt(checker)(testClockNames)(current.expression) : isCall
}

const sourceFileHasTestClock = (checker: ts.TypeChecker) => (sourceFile: ts.SourceFile) => {
  const reducer = (found: boolean, current: ts.Node) => {
    const hasTestClock = testClockReferenceNode(checker)(current)
    const signals = Array.make(found, hasTestClock)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(sourceFile)(false)
}

const isItLiveCall = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(expression)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const isLiveName = strictEqual("live")(expression.name.text)

  if (!isLiveName) {
    return isLiveName
  }

  const receiver = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(receiver)
  const receiverText = isIdentifier ? receiver.text : ""
  const isItName = strictEqual("it")(receiverText)
  const checks = Array.make(isIdentifier, isItName)

  return Array.every(checks, Boolean)
}

const testLiveRuntime =
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const liveCall = isItLiveCall(node)
    const eligible = Array.make(testRole, liveCall)

    if (!Array.every(eligible, Boolean)) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("test-live-runtime")("it.live")(node.expression)

    return Array.of(finding)
  }

const testClockForTime =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (!isTestRole(role)) {
      return emptyAdviceFindings
    }

    const timeEffect = callIsEffectApi(context.checker)("Effect")(timeEffectNames)(node)
    const retryEffect = callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)
    const scheduleBackoff = callIsEffectApi(context.checker)("Schedule")(backoffScheduleNames)(node)
    const usesTime = Array.make(timeEffect, retryEffect, scheduleBackoff)
    const hasTimeUsage = Array.some(usesTime, Boolean)
    const hasClock = sourceFileHasTestClock(context.checker)(context.sourceFile)
    const quiet = Array.make(!hasTimeUsage, hasClock)

    if (Array.some(quiet, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("test-clock-for-time")(subject)(node.expression)

    return Array.of(finding)
  }

const layerMergeNames = Array.of("mergeAll")

const layerProvideMergeNames = Array.of("provideMerge")

const authorityReferenceKeyPattern =
  /(?:secret|token|password|credential|api[_-]?key|auth|database|db|postgres|mysql|mongo|redis|sql|http|https|transport|client|connection|pool|smtp|s3|bucket)/i

const layerAuthorityVisibility =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (isTestRole(role)) {
      return emptyAdviceFindings
    }

    const referenceNames = Array.of("Reference")
    const isReference = callIsEffectApi(context.checker)("Context")(referenceNames)(node)

    if (!isReference) {
      return emptyAdviceFindings
    }

    const key = pipe(stringLiteralArgument(0)(node), Option.getOrElse(Function.constant("")))
    const hasKey = key.length > 0
    const matchesAuthorityKey = authorityReferenceKeyPattern.test(key)
    const authorityParts = Array.make(hasKey, matchesAuthorityKey)
    const looksAuthoritative = Array.every(authorityParts, Boolean)

    if (!looksAuthoritative) {
      return emptyAdviceFindings
    }

    const subject = `Context.Reference(${JSON.stringify(key)})`
    const finding = makeAdviceFinding("layer-authority-visibility")(subject)(node.expression)

    return Array.of(finding)
  }

const layerComposition =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Non-root Layer.provide is owned by functional-core because only roots own composition advice.
    const mergeAll = callIsEffectApi(context.checker)("Layer")(layerMergeNames)(node)
    const rootRole = isRootRole(role)
    const provideMergeCall = callIsEffectApi(context.checker)("Layer")(layerProvideMergeNames)(node)
    const provideMergeParts = Array.make(rootRole, provideMergeCall)
    const provideMerge = Array.every(provideMergeParts, Boolean)
    const candidates = Array.make(mergeAll, provideMerge)
    const hasCandidate = Array.some(candidates, Boolean)
    const testRole = isTestRole(role)
    const skip = Array.make(!hasCandidate, testRole)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    // mergeAll is advice in any non-test role because provideMerge is root-only.
    const allowProvideMerge = isRootRole(role)
    const emit = Array.make(mergeAll, allowProvideMerge)

    if (!Array.some(emit, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("layer-composition")(subject)(node.expression)

    return Array.of(finding)
  }

const ignoreEffectNames = Array.make("ignore", "ignoreCause")

const foreverEffectNames = Array.of("forever")

const forkScopedNames = Array.make("forkScoped", "forkIn")

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

const scopedBackgroundWork =
  (context: MatchContext) =>
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

const observableWorkerFailure =
  (context: MatchContext) =>
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

  const reducer = (found: boolean, current: ts.Node) => {
    const hasPageToken = pageTokenNode(current)
    const signals = Array.make(found, hasPageToken)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(node)(false)
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
  const reducer = (found: boolean, current: ts.Node) => {
    const accumulates = pageAccumulateNode(current)
    const signals = Array.make(found, accumulates)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(node)(false)
}

const streamPagination =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const skip = Array.make(testRole, nonProduction)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const pageTokenLoop = isPageTokenLoop(node)
    const accumulates = loopAccumulatesPages(node)
    const eligible = Array.make(pageTokenLoop, accumulates)

    if (!Array.every(eligible, Boolean)) {
      return emptyAdviceFindings
    }

    // Stay quiet when Stream.paginate is already chosen because the preferred API is present.
    const usesPaginateReducer = (found: boolean, current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isPaginateCall =
        isCall && callIsEffectApi(context.checker)("Stream")(streamPaginateNames)(current)

      const signals = Array.make(found, isPaginateCall)

      return Array.some(signals, Boolean)
    }

    const scan = Function.flip(foldAst(usesPaginateReducer))(false)
    const usesPaginate = pipe(enclosingFunctionLike(node), Option.exists(scan))

    if (usesPaginate) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("stream-pagination")("page-token loop")(node)

    return Array.of(finding)
  }

const catchAllNames = Array.make("catchAll", "catchAllDefect")

const failNames = Array.make("fail", "failSync")

const domainErrorPattern = /Error|Fail|Fault|Defect|Tagged/i

const builtinErrorPattern = /^(Error|TypeError|RangeError)$/

const newExpressionCalleeText = (expression: ts.NewExpression) =>
  pipe(expression.expression.getText(), Option.some)

const callExpressionCalleeText = (expression: ts.CallExpression) =>
  pipe(expression.expression.getText(), Option.some)

const constructionTextOf = (current: ts.Node) =>
  pipe(
    EffectMatch.value(current),
    EffectMatch.when(ts.isNewExpression, newExpressionCalleeText),
    EffectMatch.when(ts.isCallExpression, callExpressionCalleeText),
    EffectMatch.orElse(() => Option.none())
  )

const isTaggedDomainConstruction = (text: string) => {
  const looksDomain = domainErrorPattern.test(text)
  const isBuiltin = builtinErrorPattern.test(text)
  const notBuiltin = !isBuiltin
  const checks = Array.make(looksDomain, notBuiltin)

  return Array.every(checks, Boolean)
}

const isRawErrorConstruction = (expression: ts.NewExpression) => {
  const callee = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(callee)
  const calleeText = isIdentifier ? callee.text : ""
  const isErrorName = strictEqual("Error")(calleeText)
  const checks = Array.make(isIdentifier, isErrorName)

  return Array.every(checks, Boolean)
}

const typedBoundaryError =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Map adapter/app failures to domain errors because callers need typed boundaries.
    const isAdapter = strictEqual("adapter")(role)
    const isApplication = strictEqual("application")(role)
    const allowed = Array.make(isAdapter, isApplication)

    if (!Array.some(allowed, Boolean)) {
      return emptyAdviceFindings
    }

    const catchAllCall = callIsEffectApi(context.checker)("Effect")(catchAllNames)(node)
    const catchCauseCall = callIsEffectApi(context.checker)("Effect")(catchCauseNames)(node)
    const catchAllParts = Array.make(catchAllCall, catchCauseCall)
    const catchAll = Array.some(catchAllParts, Boolean)

    if (!catchAll) {
      return emptyAdviceFindings
    }

    const handlerOption = pipe(
      Option.fromNullishOr(node.arguments[1]),
      Option.orElse(() => Option.fromNullishOr(node.arguments[0]))
    )

    if (Option.isNone(handlerOption)) {
      return emptyAdviceFindings
    }

    // Stay quiet when the handler already because mapping is present.
    const mapsTaggedErrorReducer = (found: boolean, current: ts.Node) => {
      const taggedConstruction = pipe(
        constructionTextOf(current),
        Option.exists(isTaggedDomainConstruction)
      )

      const failConstruction = pipe(
        Option.liftPredicate(ts.isCallExpression)(current),
        Option.exists(callIsEffectApi(context.checker)("Effect")(failNames))
      )

      const signals = Array.make(found, taggedConstruction, failConstruction)

      return Array.some(signals, Boolean)
    }

    const mapsTaggedError = foldAst(mapsTaggedErrorReducer)(handlerOption.value)(false)

    // Only flag handlers that rethrow or return raw Error because that skips domain mapping.
    const returnsRawErrorReducer = (found: boolean, current: ts.Node) => {
      const rawError = pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isThrowStatement, Function.constTrue),
        EffectMatch.when(ts.isNewExpression, isRawErrorConstruction),
        EffectMatch.orElse(Function.constFalse)
      )

      const signals = Array.make(found, rawError)

      return Array.some(signals, Boolean)
    }

    const returnsRawError = foldAst(returnsRawErrorReducer)(handlerOption.value)(false)
    const mapsWithoutRawParts = Array.make(mapsTaggedError, !returnsRawError)
    const mapsWithoutRaw = Array.every(mapsWithoutRawParts, Boolean)
    const quiet = Array.make(mapsWithoutRaw, !returnsRawError)

    if (Array.some(quiet, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("typed-boundary-error")(subject)(node.expression)

    return Array.of(finding)
  }

const callAdviceFindings =
  (context: MatchContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression) => {
    const configFindings = configRefinedValues(context)(role)(node)
    const retryFindings = retryWithoutJitter(context)(role)(node)
    const rawFetchFindings = rawFetchOutsideAdapter(context)(index)(role)(node)
    const liveRuntimeFindings = testLiveRuntime(role)(node)
    const clockFindings = testClockForTime(context)(role)(node)
    const thinHandlerFindings = thinHttpHandlers(context)(role)(node)
    const transactionFindings = transactionNetworkWork(context)(role)(node)
    const authorityFindings = layerAuthorityVisibility(context)(role)(node)
    const compositionFindings = layerComposition(context)(role)(node)
    const scopedFindings = scopedBackgroundWork(context)(role)(node)
    const cacheFindings = cachePreference(context)(role)(node)
    const queueFindings = publicQueue(context)(role)(node)
    const keyedFindings = keyedStreamWork(context)(role)(node)
    const typedBoundaryFindings = typedBoundaryError(context)(role)(node)
    const schemaDecodeFindings = boundarySchemaDecode(context)(role)(node)
    const idempotentFindings = idempotentRetry(context)(index)(role)(node)
    const workerFailureFindings = observableWorkerFailure(context)(role)(node)
    const httpClientFindings = httpClientPreference(context)(index)(role)(node)

    const collectors = Array.make(
      configFindings,
      retryFindings,
      rawFetchFindings,
      liveRuntimeFindings,
      clockFindings,
      thinHandlerFindings,
      transactionFindings,
      authorityFindings,
      compositionFindings,
      scopedFindings,
      cacheFindings,
      queueFindings,
      keyedFindings,
      typedBoundaryFindings,
      schemaDecodeFindings,
      idempotentFindings,
      workerFailureFindings,
      httpClientFindings
    )

    return Array.flatten(collectors)
  }

const newExpressionAdviceFindings =
  (context: MatchContext) => (role: ArchitectureRole) => (node: ts.NewExpression) => {
    const cacheFindings = cachePreference(context)(role)(node)
    const keyedFindings = keyedStreamWork(context)(role)(node)

    return Array.appendAll(cacheFindings, keyedFindings)
  }

const nodeAdviceFindings =
  (context: MatchContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.Node) => {
    const fromCalls = pipe(
      callExpressionOf(node),
      Option.map(callAdviceFindings(context)(index)(role)),
      Option.getOrElse(Function.constant(emptyAdviceFindings))
    )

    const fromNew = ts.isNewExpression(node)
      ? newExpressionAdviceFindings(context)(role)(node)
      : emptyAdviceFindings

    const fromLoops = streamPagination(context)(role)(node)
    const fromDeclarations = publicQueue(context)(role)(node)
    const groups = Array.make(fromCalls, fromNew, fromLoops, fromDeclarations)

    return Array.flatten(groups)
  }

const effectQualityAdviceFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityAdviceFinding> => {
  const role = roleForSourceFile(index, context.sourceFile)
  const findingsForRole = nodeAdviceFindings(context)(index)

  return Option.match(role, {
    onNone: Function.constant(emptyAdviceFindings),
    onSome: Function.flip(findingsForRole)(node)
  })
}

const isSyntaxKindNumber = (candidate: string | number): candidate is ts.SyntaxKind =>
  strictEqual("number")(typeof candidate)

const isInSyntaxKindRange = (candidate: ts.SyntaxKind) => {
  const isNonNegative = candidate >= 0
  const isBeforeCount = candidate < ts.SyntaxKind.Count
  const bounds = Array.make(isNonNegative, isBeforeCount)

  return Array.every(bounds, Boolean)
}

const syntaxKindValues = Object.values(ts.SyntaxKind)

const numericSyntaxKinds = Array.filter(syntaxKindValues, isSyntaxKindNumber)

const boundedSyntaxKinds = Array.filter(numericSyntaxKinds, isInSyntaxKindRange)

const everySyntaxKind = Array.dedupe(boundedSyntaxKinds)

const acceptsAnyNode = (_node: ts.Node): _node is ts.Node => true

const detectionFromFinding =
  (_context: MatchContext) =>
  (finding: EffectQualityAdviceFinding): Match<EffectQualityAdviceData> => {
    const data = EffectQualityAdviceData.make({
      kind: finding.kind,
      subject: finding.subject
    })

    return makeNodeMatch(finding.node, data)
  }

const evidenceElements =
  (index: EffectQualityIndex) =>
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<Match<EffectQualityAdviceData>> => {
    const findings = effectQualityAdviceFindings(context, index, node)
    const toDetection = detectionFromFinding(context)

    return Array.map(findings, toDetection)
  }

const evidenceSubscriptions = (
  index: EffectQualityIndex
): ReadonlyArray<Subscription<EffectQualityAdviceData>> => {
  const elements = evidenceElements(index)
  const subscribe = nodeSubscriptions(everySyntaxKind)(acceptsAnyNode)

  return subscribe(elements)
}

export const makeEffectQualityEvidenceMatcher = makeEffectQualityMatcher(evidenceSubscriptions)
