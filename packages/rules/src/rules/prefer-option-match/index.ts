import { preferOptionMatchScanner } from "./preferOptionMatch.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferOptionMatch = () => {
  const message = "Avoid using Option.isSome/isNone in a ternary to unwrap an Option."

  const hint =
    "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
    "instead of manually checking and accessing .value."

  const preferOptionMatch = makeRule("prefer-option-match")(preferOptionMatchScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferOptionMatch
}

export const preferOptionMatch = makePreferOptionMatch()
