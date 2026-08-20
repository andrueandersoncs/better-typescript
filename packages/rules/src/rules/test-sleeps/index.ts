import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Option, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { callOrPipeStageSubject } from "../../internal/builtins/effectQuality/effectApiFacts.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  sleepNames,
  isInsideEffectVitestTest
} from "../../internal/builtins/effectQuality/timeAndRetryRulesShared.js"

const testSleepFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    if (!isInsideEffectVitestTest(context.checker)(node)) {
      return noSubjectMatches
    }

    return pipe(
      callOrPipeStageSubject(context.checker)("Effect")(sleepNames)(node),
      Option.map(makeSubjectMatch("Effect.sleep")),
      Option.toArray
    )
  }

const testSleepsScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(testSleepFindings)

export const testSleeps = makeRule("test-sleeps")(testSleepsScanner)(
  fixedRuleMessage(
    "Avoid Effect.sleep in tests; synchronize deterministically.",
    "Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook."
  )
)
