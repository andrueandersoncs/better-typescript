import { noManualTypeDispatchMatcher } from "@better-typescript/matchers/builtins/noManualTypeDispatch"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid dispatching on a value with a chain of if statements that each return."

const hint =
  "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
  "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
  "error rather than a silent fall-through."

export const noManualTypeDispatch = makeBuiltinPolicy(
  "no-manual-type-dispatch",
  noManualTypeDispatchMatcher,
  factGuidance(message, hint)
)
