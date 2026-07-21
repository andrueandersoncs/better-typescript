import { noArraySpreadMatcher } from "@better-typescript/matchers/builtins/noArraySpread"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid the array-spread operator when constructing arrays."

const hint =
  "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
  "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
  "and Array.fromIterable to materialize an iterable."

export const noArraySpread = makeBuiltinPolicy(
  "no-array-spread",
  noArraySpreadMatcher,
  factGuidance(message, hint)
)
