import { requireConstructionNameConsistencyScanner } from "./requireConstructionNameConsistency.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequireConstructionNameConsistencyFindings = (
  match: Match<
    typeof requireConstructionNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  >
) => {
  const makeFactoryMasqueradeFindings = (
    fact: Extract<
      typeof requireConstructionNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "factory-masquerade" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} claims factory construction via ${fact.operation}, but looks up or projects existing data.`,
      "Rename with lookup or projection vocabulary, or return a freshly constructed value."
    )

  const makeUnnamedConstructionFindings = (
    fact: Extract<
      typeof requireConstructionNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "unnamed-construction" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} constructs a value, but does not use construction vocabulary.`,
      "Rename with make/create/build/construct (for example makeUser), or use a recognized " +
        "variant constructor such as some/none/left/right/succeed/fail/of."
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "factory-masquerade" }, makeFactoryMasqueradeFindings),
    EffectMatch.when({ kind: "unnamed-construction" }, makeUnnamedConstructionFindings),
    EffectMatch.exhaustive
  )
}

export const requireConstructionNameConsistency = makeRule("require-construction-name-consistency")(
  requireConstructionNameConsistencyScanner
)(Function.constant(makeRequireConstructionNameConsistencyFindings))
