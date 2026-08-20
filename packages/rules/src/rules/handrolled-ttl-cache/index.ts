import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Option, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

import { newMapExpression } from "../../internal/builtins/effectQuality/cacheRulesShared.js"

const sourceLooksLikeHandrolledTtlCache = (sourceText: string) => {
  const hasExpires = /\bexpires(?:At|On|In)?\b/u.test(sourceText)
  const hasDateNow = sourceText.includes("Date.now")
  const hasDelete = sourceText.includes(".delete(")
  const hasExpiryAndClock = hasExpires && hasDateNow

  return hasExpiryAndClock && hasDelete
}

const handrolledTtlCacheFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      newMapExpression(node),
      Option.filter(() => sourceLooksLikeHandrolledTtlCache(context.sourceFile.text)),
      Option.map(makeSubjectMatch("Map")),
      Option.toArray
    )

const handrolledTtlCacheScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(
  handrolledTtlCacheFindings
)

export const handrolledTtlCache = makeRule("handrolled-ttl-cache")(handrolledTtlCacheScanner)(
  fixedRuleMessage(
    "Avoid a hand-rolled TTL Map cache when Effect Cache fits.",
    "Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit."
  )
)
