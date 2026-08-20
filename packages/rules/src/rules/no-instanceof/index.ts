import { noInstanceofScanner } from "./noInstanceof.js"

import { Function } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeNoInstanceof = () => {
  const hint =
    "Use a stable discriminant, an explicit structural type guard, or Schema.is with a " +
    "structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains " +
    "constructor semantics, so it does not make a class check structural or cross-realm safe."

  const makeNoInstanceofFindings = (
    match: Match<typeof noInstanceofScanner extends Scanner<infer Fact> ? Fact : never>
  ) =>
    makeRuleMessage(`Avoid instanceof for the first-party class "${match.fact.className}".`, hint)

  const noInstanceof = makeRule("no-instanceof")(noInstanceofScanner)(
    Function.constant(makeNoInstanceofFindings)
  )

  return noInstanceof
}

export const noInstanceof = makeNoInstanceof()
