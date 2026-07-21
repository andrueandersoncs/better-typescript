import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  requireResultCardinalityNameConsistencyMatcher,
  type RequireResultCardinalityNameConsistencyFact,
  type RequireResultCardinalityPluralForOneFact,
  type RequireResultCardinalitySingularForManyFact
} from "@better-typescript/matchers/builtins/requireResultCardinalityNameConsistency"
import { makeBuiltinPolicy } from "../definePolicy.js"

const makeRequireResultCardinalityNameConsistencyFindings = (
  match: Match<RequireResultCardinalityNameConsistencyFact>
) => {
  const makePluralForOneFindings = (fact: RequireResultCardinalityPluralForOneFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} names its result as plural ${fact.claimed}, but returns ${fact.cardinality}.`,
      `Rename the result noun to singular ${fact.singular} so the name matches a single returned value.`,
      match.fact
    )

  const makeSingularForManyFindings = (fact: RequireResultCardinalitySingularForManyFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} names its result as singular ${fact.claimed}, but returns ${fact.cardinality}.`,
      `Rename the result noun to plural ${fact.plural} so the name matches the collection result.`,
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "plural-for-one" }, makePluralForOneFindings),
    EffectMatch.when({ kind: "singular-for-many" }, makeSingularForManyFindings),
    EffectMatch.exhaustive
  )
}

export const requireResultCardinalityNameConsistency = makeBuiltinPolicy(
  "require-result-cardinality-name-consistency",
  requireResultCardinalityNameConsistencyMatcher,
  Function.constant(makeRequireResultCardinalityNameConsistencyFindings)
)
