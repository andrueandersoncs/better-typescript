import { noForLoopsMatcher } from "@better-typescript/matchers/builtins/noForLoops"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid imperative logic in iterator-based for loops."

const hint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

export const noForLoops = defineBuiltinPolicy(
  "no-for-loops",
  noForLoopsMatcher,
  factGuidance(message, hint)
)
