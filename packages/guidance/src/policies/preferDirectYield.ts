import { preferDirectYieldMatcher } from "@better-typescript/matchers/builtins/preferDirectYield"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid binding an Effect only to yield* it."

const hint =
  "Write const result = yield* expression (or yield* expression when the result " +
  "is unused) instead of naming a temporary Effect and yielding that name. Keep " +
  "extracting nested call arguments into their own consts so no-nested-calls " +
  "stays satisfied."

export const preferDirectYield = defineBuiltinPolicy(
  "prefer-direct-yield",
  preferDirectYieldMatcher,
  factGuidance(message, hint)
)
