import { noForOfLoopsScanner } from "./noForOfLoops.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const noForOfLoopsSynchronousHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

const noForOfLoopsAsynchronousHint =
  "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another " +
  "Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values."

const noForOfLoopsRuleMessage: RuleMessage<
  typeof noForOfLoopsScanner extends Scanner<infer Fact> ? Fact : never
> = () => (match: Match<typeof noForOfLoopsScanner extends Scanner<infer Fact> ? Fact : never>) =>
  makeRuleMessage(
    "Avoid imperative logic in for..of loops.",
    match.fact.isAsync ? noForOfLoopsAsynchronousHint : noForOfLoopsSynchronousHint
  )

export const noForOfLoops =
  makeRule("no-for-of-loops")(noForOfLoopsScanner)(noForOfLoopsRuleMessage)
