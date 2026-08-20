import { requireResultShapeNameConsistencyScanner } from "./requireResultShapeNameConsistency.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequireResultShapeNameConsistencyRuleMessage: RuleMessage<
  typeof requireResultShapeNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
> =
  () =>
  (
    match: Match<
      typeof requireResultShapeNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const { nameText, expected, observed, label } = match.fact

    return makeRuleMessage(
      `${nameText} claims a ${expected} result via ${label}, but returns ${observed}.`,
      `Align the name with the actual result, or change the return type to ${expected}. ` +
        `Keep strong operation words only when the result shape matches.`
    )
  }

export const requireResultShapeNameConsistency = makeRule("require-result-shape-name-consistency")(
  requireResultShapeNameConsistencyScanner
)(makeRequireResultShapeNameConsistencyRuleMessage)
