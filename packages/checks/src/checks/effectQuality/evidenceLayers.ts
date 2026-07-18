import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { stringLiteralArgument } from "./astQueries.js"
import { isRootRole, isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { apiSubject, callIsEffectApi } from "./evidenceSupport.js"

const layerMergeNames = Array.of("mergeAll")

const layerProvideMergeNames = Array.of("provideMerge")

const authorityReferenceKeyPattern =
  /(?:secret|token|password|credential|api[_-]?key|auth|database|db|postgres|mysql|mongo|redis|sql|http|https|transport|client|connection|pool|smtp|s3|bucket)/i

export const layerAuthorityVisibility =
  (context: CheckContext) =>
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

export const layerComposition =
  (context: CheckContext) =>
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
