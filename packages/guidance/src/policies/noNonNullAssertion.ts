import { noNonNullAssertionMatcher } from "@better-typescript/matchers/builtins/noNonNullAssertion"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid non-null assertions."

const hint =
  "The ! operator silences the type checker instead of handling the absent case, " +
  "trading a compile-time proof for a runtime crash. Convert the nullable value " +
  "with Option.fromNullishOr and handle both branches (Option.match, " +
  "Option.getOrElse), or narrow it with a type guard the checker verifies."

export const noNonNullAssertion = defineBuiltinPolicy(
  "no-non-null-assertion",
  noNonNullAssertionMatcher,
  factGuidance(message, hint)
)
