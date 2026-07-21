import { preferEffectArrayCountByMatcher } from "@better-typescript/matchers/builtins/preferEffectArrayCountBy"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid filtering an array only to count matching elements."

const hint =
  "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from " +
  "Effect. Remove a surrounding helper when that is its only behavior."

export const preferEffectArrayCountBy = makeBuiltinPolicy(
  "prefer-effect-array-count-by",
  preferEffectArrayCountByMatcher,
  factGuidance(message, hint)
)
