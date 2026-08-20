import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { conventionalArchitectureRoleOf } from "../../internal/support/conventionalArchitectureRoleOf.js"

import { hasEffectCallAncestor } from "../../internal/support/effectApi/hasEffectCallAncestor.js"

import { toRelativeFileName } from "../../internal/support/paths.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  tryPromiseNames,
  isBareFetchCall
} from "../../internal/builtins/effectQuality/httpRulesShared.js"

const sourceFileIsAdapter = (context: MatchContext) => {
  const relativePath = toRelativeFileName(context.projectRoot)(context.sourceFile.fileName)
  const role = conventionalArchitectureRoleOf(relativePath)

  return pipe(role, Option.exists(strictEqual("adapter")))
}

const rawFetchOutsideAdapterCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const bareFetch = isBareFetchCall(context.checker)(node)
    const adapter = sourceFileIsAdapter(context)
    const insideTryPromise = hasEffectCallAncestor(context.checker)("Effect")(tryPromiseNames)(node)
    const ignoreRawFetchReasons = Array.make(!bareFetch, adapter, insideTryPromise)
    const shouldIgnoreRawFetch = Array.some(ignoreRawFetchReasons, Boolean)

    if (shouldIgnoreRawFetch) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("fetch")(node.expression)

    return Array.of(finding)
  }

const rawFetchOutsideAdapterScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  rawFetchOutsideAdapterCandidates
)

export const rawFetchOutsideAdapter = makeRule("raw-fetch-outside-adapter")(
  rawFetchOutsideAdapterScanner
)(
  fixedRuleMessage(
    "Keep raw fetch in an adapter.",
    "Move raw fetch behind a named adapter boundary or use Effect HttpClient."
  )
)
