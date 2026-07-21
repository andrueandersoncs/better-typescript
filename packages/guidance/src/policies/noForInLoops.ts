import { noForInLoopsMatcher } from "@better-typescript/matchers/builtins/noForInLoops"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid imperative logic in for..in loops."

const hint =
  "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
  "or Record.toEntries(), instead."

export const noForInLoops = makeBuiltinPolicy(
  "no-for-in-loops",
  noForInLoopsMatcher,
  factGuidance(message, hint)
)
