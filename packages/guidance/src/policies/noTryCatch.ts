import { noTryCatchMatcher } from "@better-typescript/matchers/builtins/noTryCatch"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid try/catch for error handling."

const hint =
  "Model effectful code that can fail as an Effect and declare its failures as explicit " +
  'Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}. ' +
  "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block."

export const noTryCatch = defineBuiltinPolicy(
  "no-try-catch",
  noTryCatchMatcher,
  factGuidance(message, hint)
)
