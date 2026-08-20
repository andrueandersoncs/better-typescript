import { requireLookupTotalityNameConsistencyScanner } from "./requireLookupTotalityNameConsistency.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequireLookupTotalityNameConsistencyFindings = (
  match: Match<
    typeof requireLookupTotalityNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  >
) => {
  const makeAbsenceClaimFindings = (
    fact: Extract<
      typeof requireLookupTotalityNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "optional-claim" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} claims optional lookup via ${fact.claimLabel}, but returns total data.`,
      "Return optional or fallible data (Option, nullish, Result), or remove find/lookup/maybe/optional from the name."
    )

  const makePresenceClaimFindings = (
    fact: Extract<
      typeof requireLookupTotalityNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "total-claim" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} claims required access via ${fact.claimLabel}, but returns optional data.`,
      "Return total data, or remove require/unsafe/getOrThrow/getOrElse from the name."
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "optional-claim" }, makeAbsenceClaimFindings),
    EffectMatch.when({ kind: "total-claim" }, makePresenceClaimFindings),
    EffectMatch.exhaustive
  )
}

export const requireLookupTotalityNameConsistency = makeRule(
  "require-lookup-totality-name-consistency"
)(requireLookupTotalityNameConsistencyScanner)(
  Function.constant(makeRequireLookupTotalityNameConsistencyFindings)
)
