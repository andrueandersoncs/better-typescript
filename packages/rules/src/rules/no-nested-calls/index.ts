import { noNestedCallsScanner } from "./noNestedCalls.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const noNestedCallsHint =
  "A call whose result feeds another call hides a sequence of steps in one expression " +
  "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
  "gen block) and pass the name, or restructure data-last so the value flows through " +
  "pipe. Calls that return functions stay inline: currying and pipe stages read " +
  "left-to-right."

const makeNoNestedCallsRuleMessage: RuleMessage<
  typeof noNestedCallsScanner extends Scanner<infer Fact> ? Fact : never
> = () => (match: Match<typeof noNestedCallsScanner extends Scanner<infer Fact> ? Fact : never>) =>
  makeRuleMessage(
    `Avoid computing ${match.fact.callText} inline in the arguments of ${match.fact.consumerText}.`,
    noNestedCallsHint
  )

export const noNestedCalls = makeRule("no-nested-calls")(noNestedCallsScanner)(
  makeNoNestedCallsRuleMessage
)
