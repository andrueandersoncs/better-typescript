import { noExplicitAnyReturnMatcher } from "@better-typescript/matchers/builtins/noExplicitAnyReturn"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid function return types that include any."

const hint =
  "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
  "use unknown and narrow before use."

export const noExplicitAnyReturn = makeBuiltinPolicy(
  "no-explicit-any-return",
  noExplicitAnyReturnMatcher,
  factGuidance(message, hint)
)
