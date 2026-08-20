import { requireConversionDirectionConsistencyScanner } from "./requireConversionDirectionConsistency.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequireConversionDirectionConsistencyFindings = (
  match: Match<
    typeof requireConversionDirectionConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  >
) => {
  const { axis, nameText, claimed, expected } = match.fact

  const resultMessage = () =>
    `${nameText} names its conversion result as ${claimed}, but it returns ${expected}.`

  const sourceMessage = () =>
    `${nameText} names its conversion source as ${claimed}, but its source is ${expected}.`

  const resultHint = () =>
    `Rename the result phrase to ${expected}, or return a value whose concept is ${claimed}.`

  const sourceHint = () =>
    `Rename the source phrase to ${expected}, or accept a parameter whose concept is ${claimed}.`

  const message = pipe(
    EffectMatch.value(axis),
    EffectMatch.when("result", resultMessage),
    EffectMatch.when("source", sourceMessage),
    EffectMatch.exhaustive
  )

  const hint = pipe(
    EffectMatch.value(axis),
    EffectMatch.when("result", resultHint),
    EffectMatch.when("source", sourceHint),
    EffectMatch.exhaustive
  )

  return makeRuleMessage(message, hint)
}

export const requireConversionDirectionConsistency = makeRule(
  "require-conversion-direction-consistency"
)(requireConversionDirectionConsistencyScanner)(
  Function.constant(makeRequireConversionDirectionConsistencyFindings)
)
