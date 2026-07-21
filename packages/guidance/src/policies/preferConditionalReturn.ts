import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferConditionalReturnMatcher,
  type PreferConditionalReturnFact
} from "@better-typescript/matchers/builtins/preferConditionalReturn"
import { makeBuiltinPolicy } from "../definePolicy.js"

const preferConditionalReturnGuidance: Guidance<PreferConditionalReturnFact> = () => (match) =>
  makeFindings(
    match.target,
    "Avoid if statements that only choose between two return values.",
    `Return a conditional expression instead: return ${match.fact.returnText}.`,
    match.fact
  )

export const preferConditionalReturn = makeBuiltinPolicy(
  "prefer-conditional-return",
  preferConditionalReturnMatcher,
  preferConditionalReturnGuidance
)
