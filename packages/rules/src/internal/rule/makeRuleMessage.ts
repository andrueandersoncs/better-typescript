import { Function } from "effect"
import { RuleMessageCopy } from "./ruleMessage.js"

export const makeRuleMessage = Function.untupled(
  ([message, hint]: readonly [string, string]): RuleMessageCopy =>
    RuleMessageCopy.make({
      message,
      hint
    })
)
