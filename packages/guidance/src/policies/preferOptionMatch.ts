import { preferOptionMatchMatcher } from "@better-typescript/matchers/builtins/preferOptionMatch"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid using Option.isSome/isNone in a ternary to unwrap an Option."

const hint =
  "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
  "instead of manually checking and accessing .value."

export const preferOptionMatch = makeBuiltinPolicy(
  "prefer-option-match",
  preferOptionMatchMatcher,
  factGuidance(message, hint)
)
