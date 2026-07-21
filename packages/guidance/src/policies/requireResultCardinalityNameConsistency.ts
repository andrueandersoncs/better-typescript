import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  requireResultCardinalityNameConsistencyMatcher,
  type RequireResultCardinalityNameConsistencyFact,
  type RequireResultCardinalityPluralForOneFact,
  type RequireResultCardinalitySingularForManyFact
} from "@better-typescript/matchers/builtins/requireResultCardinalityNameConsistency"
import { defineBuiltinPolicy } from "../definePolicy.js"

const requireResultCardinalityNameConsistencyFindings = (
  match: Match<RequireResultCardinalityNameConsistencyFact>
) => {
  const pluralForOneFindings = (fact: RequireResultCardinalityPluralForOneFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} names its result as plural ${fact.claimed}, but returns ${fact.cardinality}.`,
      `Rename the result noun to singular ${fact.singular} so the name matches a single returned value.`,
      match.fact
    )

  const singularForManyFindings = (fact: RequireResultCardinalitySingularForManyFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} names its result as singular ${fact.claimed}, but returns ${fact.cardinality}.`,
      `Rename the result noun to plural ${fact.plural} so the name matches the collection result.`,
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "plural-for-one" }, pluralForOneFindings),
    EffectMatch.when({ kind: "singular-for-many" }, singularForManyFindings),
    EffectMatch.exhaustive
  )
}

export const requireResultCardinalityNameConsistency = defineBuiltinPolicy(
  "require-result-cardinality-name-consistency",
  requireResultCardinalityNameConsistencyMatcher,
  Function.constant(requireResultCardinalityNameConsistencyFindings)
)
