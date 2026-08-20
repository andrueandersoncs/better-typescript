import { noAsyncFunctionsScanner } from "./noAsyncFunctions.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const noAsyncFunctionsMessage = "Avoid declaring functions as async."

const noAsyncFunctionsHint =
  "Model asynchronous work with Effect instead of async/await. To integrate with a " +
  "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
  "outgoing Promise-returning callback contract with a non-async function that " +
  "returns Effect.runPromise(effect)."

export const noAsyncFunctions = makeRule("no-async-functions")(noAsyncFunctionsScanner)(
  fixedRuleMessage(noAsyncFunctionsMessage, noAsyncFunctionsHint)
)
