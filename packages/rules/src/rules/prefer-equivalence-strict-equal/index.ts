import { preferEquivalenceStrictEqualScanner } from "./preferEquivalenceStrictEqual.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferEquivalenceStrictEqual = () => {
  const message = "Avoid raw strict equality (===)."

  const hint =
    "Import Equivalence from effect and replace this comparison with " +
    "Equivalence.strictEqual<YourType>()(left, right)."

  const preferEquivalenceStrictEqual = makeRule("prefer-equivalence-strict-equal")(
    preferEquivalenceStrictEqualScanner
  )(fixedRuleMessage(message, hint))

  return preferEquivalenceStrictEqual
}

export const preferEquivalenceStrictEqual = makePreferEquivalenceStrictEqual()
