import { noAsyncFunctionsMatcher } from "@better-typescript/matchers/builtins/noAsyncFunctions"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid declaring functions as async."

const hint =
  "Model asynchronous work with Effect instead of async/await. To integrate with a " +
  "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
  "outgoing Promise-returning callback contract with a non-async function that " +
  "returns Effect.runPromise(effect)."

export const noAsyncFunctions = defineBuiltinPolicy(
  "no-async-functions",
  noAsyncFunctionsMatcher,
  factGuidance(message, hint)
)
