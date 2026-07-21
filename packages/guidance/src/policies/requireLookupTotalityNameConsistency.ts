import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  requireLookupTotalityNameConsistencyMatcher,
  type RequireLookupOptionalClaimFact,
  type RequireLookupTotalClaimFact,
  type RequireLookupTotalityNameConsistencyFact
} from "@better-typescript/matchers/builtins/requireLookupTotalityNameConsistency"
import { defineBuiltinPolicy } from "../definePolicy.js"

const requireLookupTotalityNameConsistencyFindings = (
  match: Match<RequireLookupTotalityNameConsistencyFact>
) => {
  const absenceClaimFindings = (fact: RequireLookupOptionalClaimFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} claims optional lookup via ${fact.claimLabel}, but returns total data.`,
      "Return optional or fallible data (Option, nullish, Result), or remove find/lookup/maybe/optional from the name.",
      match.fact
    )

  const presenceClaimFindings = (fact: RequireLookupTotalClaimFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} claims required access via ${fact.claimLabel}, but returns optional data.`,
      "Return total data, or remove require/unsafe/getOrThrow/getOrElse from the name.",
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "optional-claim" }, absenceClaimFindings),
    EffectMatch.when({ kind: "total-claim" }, presenceClaimFindings),
    EffectMatch.exhaustive
  )
}

export const requireLookupTotalityNameConsistency = defineBuiltinPolicy(
  "require-lookup-totality-name-consistency",
  requireLookupTotalityNameConsistencyMatcher,
  Function.constant(requireLookupTotalityNameConsistencyFindings)
)
