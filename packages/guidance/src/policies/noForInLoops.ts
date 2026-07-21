import { noForInLoopsMatcher } from "@better-typescript/matchers/builtins/noForInLoops"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid imperative logic in for..in loops."

const hint =
  "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
  "or Record.toEntries(), instead."

export const noForInLoops = defineBuiltinPolicy(
  "no-for-in-loops",
  noForInLoopsMatcher,
  factGuidance(message, hint)
)
