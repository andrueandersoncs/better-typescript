import { noVoidFunctionsMatcher } from "@better-typescript/matchers/builtins/noVoidFunctions"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid functions that return void."

const hint =
  "A void function either does nothing or performs a side-effect. If it does nothing, " +
  "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
  "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not " +
  "run. When a third-party API requires a void callback, annotate the value with that " +
  "API's callback type so the void contract is the consumer's, not yours."

export const noVoidFunctions = defineBuiltinPolicy(
  "no-void-functions",
  noVoidFunctionsMatcher,
  factGuidance(message, hint)
)
