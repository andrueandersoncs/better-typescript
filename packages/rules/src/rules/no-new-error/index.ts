import { noNewErrorScanner } from "./noNewError.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoNewError = () => {
  const message = "Avoid using new Error() directly."

  const hint =
    "Declare a custom error with Effect Schema.TaggedErrorClass, then use new CustomError() " +
    "instead of bare new Error()."

  const noNewError = makeRule("no-new-error")(noNewErrorScanner)(fixedRuleMessage(message, hint))

  return noNewError
}

export const noNewError = makeNoNewError()
