import { Function, flow } from "effect"
import type { RuleMessage } from "./ruleMessage.js"
import { makeRuleMessage } from "./makeRuleMessage.js"

const makeRuleMessageFromTuple = Function.tupled(makeRuleMessage)
const makeFixedRuleMessage = flow(makeRuleMessageFromTuple, Function.constant, Function.constant)

export const fixedRuleMessage: <Fact>(message: string, hint: string) => RuleMessage<Fact> =
  Function.untupled(makeFixedRuleMessage)
