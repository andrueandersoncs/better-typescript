import { preferFunctionFlipScanner } from "./preferFunctionFlip.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferFunctionFlip = () => {
  const message = "Avoid lambdas that only flip the order of a curried application."

  const hint =
    "Reorder the curried parameters so the fixed argument comes first " +
    "(data-last), then pass the partial f(y) directly — or use " +
    "Function.flip(f)(y) instead of (x) => f(x)(y)."

  const preferFunctionFlip = makeRule("prefer-function-flip")(preferFunctionFlipScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferFunctionFlip
}

export const preferFunctionFlip = makePreferFunctionFlip()
