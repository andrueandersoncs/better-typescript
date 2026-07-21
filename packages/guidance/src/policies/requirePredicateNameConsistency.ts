import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  requirePredicateNameConsistencyMatcher,
  type RequirePredicateBooleanIncompatibleFact,
  type RequirePredicateNameConsistencyFact,
  type RequirePredicateNonBooleanFact
} from "@better-typescript/matchers/builtins/requirePredicateNameConsistency"
import { makeBuiltinPolicy } from "../definePolicy.js"

const makeRequirePredicateNameConsistencyFindings = (
  match: Match<RequirePredicateNameConsistencyFact>
) => {
  const makeNonBooleanPredicateFindings = (fact: RequirePredicateNonBooleanFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} claims a predicate, but its result shape is ${fact.shape}.`,
      "Rename the function so its operation matches the non-boolean result, or return a " +
        "boolean or type-predicate result.",
      match.fact
    )

  const makeBooleanIncompatibleFindings = (fact: RequirePredicateBooleanIncompatibleFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} returns boolean, but claims the ${fact.operation} operation.`,
      "Rename with predicate vocabulary such as is, has, can, should, does, equal, " +
        "contain, include, match, exist, every, some, startsWith, or endsWith.",
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "non-boolean-predicate" }, makeNonBooleanPredicateFindings),
    EffectMatch.when({ kind: "boolean-incompatible" }, makeBooleanIncompatibleFindings),
    EffectMatch.exhaustive
  )
}

export const requirePredicateNameConsistency = makeBuiltinPolicy(
  "require-predicate-name-consistency",
  requirePredicateNameConsistencyMatcher,
  Function.constant(makeRequirePredicateNameConsistencyFindings)
)
