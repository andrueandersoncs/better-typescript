import { requireCallableRoleNameConsistencyScanner } from "./requireCallableRoleNameConsistency.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequireCallableRoleNameConsistencyRuleMessage: RuleMessage<
  typeof requireCallableRoleNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
> =
  () =>
  (
    match: Match<
      typeof requireCallableRoleNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const { nameText, role, expected } = match.fact

    return makeRuleMessage(
      `${nameText} claims the ${role} role, but does not provide ${expected}.`,
      `Rename away from the ${role} role noun, or change the signature and body so the ` +
        `${role} contract holds.`
    )
  }

export const requireCallableRoleNameConsistency = makeRule(
  "require-callable-role-name-consistency"
)(requireCallableRoleNameConsistencyScanner)(makeRequireCallableRoleNameConsistencyRuleMessage)
