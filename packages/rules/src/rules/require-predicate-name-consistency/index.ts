import { requirePredicateNameConsistencyScanner } from "./requirePredicateNameConsistency.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequirePredicateNameConsistencyFindings = (
  match: Match<
    typeof requirePredicateNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  >
) => {
  const makeNonBooleanPredicateFindings = (
    fact: Extract<
      typeof requirePredicateNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "non-boolean-predicate" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} claims a predicate, but its result shape is ${fact.shape}.`,
      "Rename the function so its operation matches the non-boolean result, or return a " +
        "boolean or type-predicate result."
    )

  const makeBooleanIncompatibleFindings = (
    fact: Extract<
      typeof requirePredicateNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "boolean-incompatible" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} returns boolean, but claims the ${fact.operation} operation.`,
      "Rename with predicate vocabulary such as is, has, can, should, does, equal, " +
        "contain, include, match, exist, every, some, startsWith, or endsWith."
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "non-boolean-predicate" }, makeNonBooleanPredicateFindings),
    EffectMatch.when({ kind: "boolean-incompatible" }, makeBooleanIncompatibleFindings),
    EffectMatch.exhaustive
  )
}

export const requirePredicateNameConsistency = makeRule("require-predicate-name-consistency")(
  requirePredicateNameConsistencyScanner
)(Function.constant(makeRequirePredicateNameConsistencyFindings))
