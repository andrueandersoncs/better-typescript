import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  requireConstructionNameConsistencyMatcher,
  type RequireConstructionFactoryMasqueradeFact,
  type RequireConstructionNameConsistencyFact,
  type RequireConstructionUnnamedConstructionFact
} from "@better-typescript/matchers/builtins/requireConstructionNameConsistency"
import { makeBuiltinPolicy } from "../definePolicy.js"

const makeRequireConstructionNameConsistencyFindings = (
  match: Match<RequireConstructionNameConsistencyFact>
) => {
  const makeFactoryMasqueradeFindings = (fact: RequireConstructionFactoryMasqueradeFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} claims factory construction via ${fact.operation}, but looks up or projects existing data.`,
      "Rename with lookup or projection vocabulary, or return a freshly constructed value.",
      match.fact
    )

  const makeUnnamedConstructionFindings = (fact: RequireConstructionUnnamedConstructionFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} constructs a value, but does not use construction vocabulary.`,
      "Rename with make/create/build/construct (for example makeUser), or use a recognized " +
        "variant constructor such as some/none/left/right/succeed/fail/of.",
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "factory-masquerade" }, makeFactoryMasqueradeFindings),
    EffectMatch.when({ kind: "unnamed-construction" }, makeUnnamedConstructionFindings),
    EffectMatch.exhaustive
  )
}

export const requireConstructionNameConsistency = makeBuiltinPolicy(
  "require-construction-name-consistency",
  requireConstructionNameConsistencyMatcher,
  Function.constant(makeRequireConstructionNameConsistencyFindings)
)
