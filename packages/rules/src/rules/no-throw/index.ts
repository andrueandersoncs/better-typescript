import { noThrowScanner } from "./noThrow.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoThrow = () => {
  const message = "Avoid throwing errors with throw."

  const hint =
    "Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: " +
    'class CustomError extends Schema.TaggedErrorClass<CustomError>()("CustomError", {}) {}; yield* new CustomError().'

  const noThrow = makeRule("no-throw")(noThrowScanner)(fixedRuleMessage(message, hint))

  return noThrow
}

export const noThrow = makeNoThrow()
