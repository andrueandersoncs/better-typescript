import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  requireConversionDirectionConsistencyMatcher,
  type RequireConversionDirectionConsistencyFact
} from "@better-typescript/matchers/builtins/requireConversionDirectionConsistency"
import { defineBuiltinPolicy } from "../definePolicy.js"

const requireConversionDirectionConsistencyFindings = (
  match: Match<RequireConversionDirectionConsistencyFact>
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

  return oneFinding(match.target, message, hint, match.fact)
}

export const requireConversionDirectionConsistency = defineBuiltinPolicy(
  "require-conversion-direction-consistency",
  requireConversionDirectionConsistencyMatcher,
  Function.constant(requireConversionDirectionConsistencyFindings)
)
