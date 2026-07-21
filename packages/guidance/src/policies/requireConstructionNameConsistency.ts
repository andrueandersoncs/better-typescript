import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  requireConstructionNameConsistencyMatcher,
  type RequireConstructionFactoryMasqueradeFact,
  type RequireConstructionNameConsistencyFact,
  type RequireConstructionUnnamedConstructionFact
} from "@better-typescript/matchers/builtins/requireConstructionNameConsistency"
import { defineBuiltinPolicy } from "../definePolicy.js"

const requireConstructionNameConsistencyFindings = (
  match: Match<RequireConstructionNameConsistencyFact>
) => {
  const factoryMasqueradeFindings = (fact: RequireConstructionFactoryMasqueradeFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} claims factory construction via ${fact.operation}, but looks up or projects existing data.`,
      "Rename with lookup or projection vocabulary, or return a freshly constructed value.",
      match.fact
    )

  const unnamedConstructionFindings = (fact: RequireConstructionUnnamedConstructionFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} constructs a value, but does not use construction vocabulary.`,
      "Rename with make/create/build/construct (for example makeUser), or use a recognized " +
        "variant constructor such as some/none/left/right/succeed/fail/of.",
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "factory-masquerade" }, factoryMasqueradeFindings),
    EffectMatch.when({ kind: "unnamed-construction" }, unnamedConstructionFindings),
    EffectMatch.exhaustive
  )
}

export const requireConstructionNameConsistency = defineBuiltinPolicy(
  "require-construction-name-consistency",
  requireConstructionNameConsistencyMatcher,
  Function.constant(requireConstructionNameConsistencyFindings)
)
