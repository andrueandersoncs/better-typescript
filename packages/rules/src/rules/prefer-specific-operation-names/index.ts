import { preferSpecificOperationNamesScanner } from "./preferSpecificOperationNames.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferSpecificOperationNamesRuleMessage: RuleMessage<
  typeof preferSpecificOperationNamesScanner extends Scanner<infer Fact> ? Fact : never
> =
  () =>
  (
    match: Match<
      typeof preferSpecificOperationNamesScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const { nameText, vague, role, renamed } = match.fact

    return makeRuleMessage(
      `${nameText} uses the vague operation ${vague}, but its body has a unique ${role} role.`,
      `Rename to ${renamed}, preserving the known object or result noun.`
    )
  }

export const preferSpecificOperationNames = makeRule("prefer-specific-operation-names")(
  preferSpecificOperationNamesScanner
)(makePreferSpecificOperationNamesRuleMessage)
