import { noManualTypeDispatchScanner } from "./noManualTypeDispatch.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoManualTypeDispatch = () => {
  const message = "Avoid dispatching on a value with a chain of if statements that each return."

  const hint =
    "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
    "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
    "error rather than a silent fall-through."

  const noManualTypeDispatch = makeRule("no-manual-type-dispatch")(noManualTypeDispatchScanner)(
    fixedRuleMessage(message, hint)
  )

  return noManualTypeDispatch
}

export const noManualTypeDispatch = makeNoManualTypeDispatch()
