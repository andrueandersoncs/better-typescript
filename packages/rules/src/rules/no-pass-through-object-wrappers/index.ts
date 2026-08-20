import { noPassThroughObjectWrappersScanner } from "./noPassThroughObjectWrappers.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoPassThroughObjectWrappers = () => {
  const message = "Avoid a function that only repackages its parameters for another constructor."

  const hint =
    "Inline the constructor or factory call at each caller. Keep a function only when it adds " +
    "policy, validation, defaults, or behavior."

  const noPassThroughObjectWrappers = makeRule("no-pass-through-object-wrappers")(
    noPassThroughObjectWrappersScanner
  )(fixedRuleMessage(message, hint))

  return noPassThroughObjectWrappers
}

export const noPassThroughObjectWrappers = makeNoPassThroughObjectWrappers()
