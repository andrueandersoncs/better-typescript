import { noUndefinedScanner } from "./noUndefined.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const noUndefinedMessages = {
  parameter: "Avoid function parameters that accept undefined.",
  "return-type": "Avoid function return types that include undefined.",
  "return-expression": "Avoid returning undefined from functions.",
  "type-declaration": "Avoid optional or undefined properties in type declarations.",
  comparison: "Avoid comparing values against undefined."
} as const

const makeNoUndefined = () => {
  const optionHint =
    "Use Effect's Option module to model optional values, and convert nullable boundaries " +
    "with Option.fromNullishOr (incoming) and Option.getOrUndefined (outgoing). When a " +
    "third-party signature forces undefined on a callback, keep the callback inline or " +
    "annotate it with the library's own callback type so the undefined stays in the " +
    "library's declaration, not yours."

  const makeNoUndefinedRuleMessage: RuleMessage<
    typeof noUndefinedScanner extends Scanner<infer Fact> ? Fact : never
  > = () => (match: Match<typeof noUndefinedScanner extends Scanner<infer Fact> ? Fact : never>) =>
    makeRuleMessage(noUndefinedMessages[match.fact.kind], optionHint)

  const noUndefined = makeRule("no-undefined")(noUndefinedScanner)(makeNoUndefinedRuleMessage)

  return noUndefined
}

export const noUndefined = makeNoUndefined()
