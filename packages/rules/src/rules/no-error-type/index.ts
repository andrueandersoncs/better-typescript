import { noErrorTypeScanner } from "./noErrorType.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoErrorType = () => {
  const message = "Avoid the built-in Error type."

  const hint =
    "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
    "type parameter, or use unknown at an untyped boundary."

  const noErrorType = makeRule("no-error-type")(noErrorTypeScanner)(fixedRuleMessage(message, hint))

  return noErrorType
}

export const noErrorType = makeNoErrorType()
