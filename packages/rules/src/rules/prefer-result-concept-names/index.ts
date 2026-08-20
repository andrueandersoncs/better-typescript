import { preferResultConceptNamesScanner } from "./preferResultConceptNames.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferResultConceptNamesRuleMessage: RuleMessage<
  typeof preferResultConceptNamesScanner extends Scanner<infer Fact> ? Fact : never
> =
  () =>
  (
    match: Match<typeof preferResultConceptNamesScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const { nameText, claimed, expected } = match.fact

    return makeRuleMessage(
      `${nameText} names its result as ${claimed}, but it returns ${expected}.`,
      `Rename the result phrase to ${expected}. Preserve operation and source qualifiers, ` +
        `using ${expected}FromSource or sourceTo${expected} when direction matters.`
    )
  }

export const preferResultConceptNames = makeRule("prefer-result-concept-names")(
  preferResultConceptNamesScanner
)(makePreferResultConceptNamesRuleMessage)
