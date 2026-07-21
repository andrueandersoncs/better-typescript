import { preferEffectRecordFilterMapMatcher } from "@better-typescript/matchers/builtins/preferEffectRecordFilterMap"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid conditional object spreads."

const hint =
  "Build a record of candidate properties and use Record.filterMap from Effect with " +
  "Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries."

export const preferEffectRecordFilterMap = makeBuiltinPolicy(
  "prefer-effect-record-filter-map",
  preferEffectRecordFilterMapMatcher,
  factGuidance(message, hint)
)
