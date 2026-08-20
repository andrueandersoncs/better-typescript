import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { callOrPipeStageSubject } from "../../internal/builtins/effectQuality/effectApiFacts.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

const runCollectNames = Array.of("runCollect")

const unboundedStreamCollectFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      callOrPipeStageSubject(context.checker)("Stream")(runCollectNames)(node),
      Option.map(makeSubjectMatch("Stream.runCollect")),
      Option.toArray
    )

const unboundedStreamCollectScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(
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
