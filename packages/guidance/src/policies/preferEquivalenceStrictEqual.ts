import { preferEquivalenceStrictEqualMatcher } from "@better-typescript/matchers/builtins/preferEquivalenceStrictEqual"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid raw strict equality (===)."

const hint =
  "Import Equivalence from effect and replace this comparison with " +
  "Equivalence.strictEqual<YourType>()(left, right)."

export const preferEquivalenceStrictEqual = makeBuiltinPolicy(
  "prefer-equivalence-strict-equal",
  preferEquivalenceStrictEqualMatcher,
  factGuidance(message, hint)
)
