import { preferComposedCallbacksScanner } from "./preferComposedCallbacks.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferComposedCallbacks = () => {
  const message = "Avoid inline callbacks that compose the callback parameter through calls."

  const hint =
    "Use flow or pipe when the parameter moves through a composition. When no combinator expresses " +
    "the transformation, name the adapter in the nearest scope and pass it by reference."

  const preferComposedCallbacks = makeRule("prefer-composed-callbacks")(
    preferComposedCallbacksScanner
  )(fixedRuleMessage(message, hint))

  return preferComposedCallbacks
}

export const preferComposedCallbacks = makePreferComposedCallbacks()
