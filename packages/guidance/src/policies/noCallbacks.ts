import { noCallbacksMatcher } from "@better-typescript/matchers/builtins/noCallbacks"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid callback-style functions that accept a function argument and return void."

const hint =
  "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
  "own API as an Effect-returning function from the start. Ambient declarations " +
  "(declare statements) describing a third-party API are permitted."

export const noCallbacks = defineBuiltinPolicy(
  "no-callbacks",
  noCallbacksMatcher,
  factGuidance(message, hint)
)
