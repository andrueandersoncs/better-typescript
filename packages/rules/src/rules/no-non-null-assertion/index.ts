import { noNonNullAssertionScanner } from "./noNonNullAssertion.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoNonNullAssertion = () => {
  const message = "Avoid non-null assertions."

  const hint =
    "The ! operator silences the type checker instead of handling the absent case, " +
    "trading a compile-time proof for a runtime crash. Convert the nullable value " +
    "with Option.fromNullishOr and handle both branches (Option.match, " +
    "Option.getOrElse), or narrow it with a type guard the checker verifies."

  const noNonNullAssertion = makeRule("no-non-null-assertion")(noNonNullAssertionScanner)(
    fixedRuleMessage(message, hint)
  )

  return noNonNullAssertion
}

export const noNonNullAssertion = makeNoNonNullAssertion()
