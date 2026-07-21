import { Array, Function, Match, Option, Predicate, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { foldAst } from "@better-typescript/matchers/sources"
import type { ArchitectureRole } from "../../support/architectureRole.js"
import { hasEffectCallAncestor } from "../functionalCoreEffect/lifecycleBoundaries.js"
import { importedEffectApiAt } from "../functionalCoreEffect/effectApiMembers.js"
import { stringLiteralArgument } from "./astQueries.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import {
  apiSubject,
  backoffScheduleNames,
  callIsEffectApi,
  enclosingFunctionName,
  isProductionRole,
  retryEffectNames
} from "./evidenceSupport.js"
import { strictEqual } from "@better-typescript/matchers/equivalence"

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

const expressionTreeHasEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const apiAt = (nodeExpression: ts.Expression) =>
      importedEffectApiAt(checker, nodeExpression, namespace, names)

    const callExpressionApiAt = (call: ts.CallExpression) => apiAt(call.expression)

    const matchCurrent = (current: ts.Node) =>
      pipe(
        Match.value(current),
        Match.when(ts.isCallExpression, callExpressionApiAt),
        Match.when(ts.isPropertyAccessExpression, apiAt),
        Match.orElse(Function.constFalse)
      )

    const reducer = (found: boolean, current: ts.Node) => {
      const matchesCurrent = matchCurrent(current)
      const signals = Array.make(found, matchesCurrent)

      return Array.some(signals, Boolean)
    }

    return foldAst(reducer)(expression)(false)
  }

const scheduleHasBackoff = (checker: ts.TypeChecker) =>
  expressionTreeHasEffectApi(checker)("Schedule")(backoffScheduleNames)

const scheduleHasJitter = (checker: ts.TypeChecker) =>
  expressionTreeHasEffectApi(checker)("Schedule")(jitterScheduleNames)

const retryScheduleArgument = (node: ts.CallExpression) => {
  const arity = node.arguments.length
  const hasScheduleSlot = arity >= 2
  const hasSingleArgument = strictEqual(1)(arity)

  if (hasScheduleSlot) {
    return Option.fromNullishOr(node.arguments[1])
  }

  return hasSingleArgument ? Option.fromNullishOr(node.arguments[0]) : Option.none()
}

const operationNameNear = (node: ts.Node) =>
  pipe(enclosingFunctionName(node), Option.getOrElse(Function.constant("")))

export const configRefinedValues =
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

export const retryWithoutJitter =
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

export const idempotentRetry =
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
