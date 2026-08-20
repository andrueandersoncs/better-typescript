import { preferDirectYieldScanner } from "./preferDirectYield.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferDirectYield = () => {
  const message = "Avoid binding an Effect only to yield* it."

  const hint =
    "Write const result = yield* expression (or yield* expression when the result " +
    "is unused) instead of naming a temporary Effect and yielding that name. Keep " +
    "extracting nested call arguments into their own consts so no-nested-calls " +
    "stays satisfied."

  const preferDirectYield = makeRule("prefer-direct-yield")(preferDirectYieldScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferDirectYield
}

export const preferDirectYield = makePreferDirectYield()
