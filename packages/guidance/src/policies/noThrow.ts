import { noThrowMatcher } from "@better-typescript/matchers/builtins/noThrow"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid throwing errors with throw."

const hint =
  "Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: " +
  'class CustomError extends Schema.TaggedErrorClass<CustomError>()("CustomError", {}) {}; yield* new CustomError().'

export const noThrow = makeBuiltinPolicy("no-throw", noThrowMatcher, factGuidance(message, hint))
