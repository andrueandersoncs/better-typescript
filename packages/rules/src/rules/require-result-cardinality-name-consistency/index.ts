import { requireResultCardinalityNameConsistencyScanner } from "./requireResultCardinalityNameConsistency.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequireResultCardinalityNameConsistencyFindings = (
  match: Match<
    typeof requireResultCardinalityNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  >
) => {
  const makePluralForOneFindings = (
    fact: Extract<
      typeof requireResultCardinalityNameConsistencyScanner extends Scanner<infer Fact>
        ? Fact
        : never,
      { readonly kind: "plural-for-one" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} names its result as plural ${fact.claimed}, but returns ${fact.cardinality}.`,
      `Rename the result noun to singular ${fact.singular} so the name matches a single returned value.`
    )

  const makeSingularForManyFindings = (
    fact: Extract<
      typeof requireResultCardinalityNameConsistencyScanner extends Scanner<infer Fact>
        ? Fact
        : never,
      { readonly kind: "singular-for-many" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} names its result as singular ${fact.claimed}, but returns ${fact.cardinality}.`,
      `Rename the result noun to plural ${fact.plural} so the name matches the collection result.`
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "plural-for-one" }, makePluralForOneFindings),
    EffectMatch.when({ kind: "singular-for-many" }, makeSingularForManyFindings),
    EffectMatch.exhaustive
  )
}

export const requireResultCardinalityNameConsistency = makeRule(
  "require-result-cardinality-name-consistency"
)(requireResultCardinalityNameConsistencyScanner)(
  Function.constant(makeRequireResultCardinalityNameConsistencyFindings)
)
