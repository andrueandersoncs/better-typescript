import { noVoidFunctionsScanner } from "./noVoidFunctions.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoVoidFunctions = () => {
  const message = "Avoid functions that return void."

  const hint =
    "A void function either does nothing or performs a side-effect. If it does nothing, " +
    "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
    "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not " +
    "run. When a third-party API requires a void callback, annotate the value with that " +
    "API's callback type so the void contract is the consumer's, not yours."

  const noVoidFunctions = makeRule("no-void-functions")(noVoidFunctionsScanner)(
    fixedRuleMessage(message, hint)
  )

  return noVoidFunctions
}

export const noVoidFunctions = makeNoVoidFunctions()
