import { preferPipeFunctionScanner } from "./preferPipeFunction.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferPipeRule = () => {
  const message = "Avoid calling .pipe() as a method."

  const hint =
    'Import pipe from "effect" and call it as a standalone function: ' +
    "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."

  const preferPipeFunction = makeRule("prefer-pipe-function")(preferPipeFunctionScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferPipeFunction
}

export const preferPipeFunction = makePreferPipeRule()
