import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectArrayMatcher,
  type PreferEffectArrayFact
} from "@better-typescript/matchers/builtins/preferEffectArray"
import { defineBuiltinPolicy } from "../definePolicy.js"

const hint =
  "Prefer Effect's Array module — define the array as a const and call " +
  "Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), " +
  "or the matching Array.* helper — instead of invoking Array.prototype methods " +
  "directly on array values."

const preferEffectArrayGuidance: Guidance<PreferEffectArrayFact> = () => (match) =>
  oneFinding(match.target, `Avoid Array.prototype.${match.fact.method}().`, hint, match.fact)

export const preferEffectArray = defineBuiltinPolicy(
  "prefer-effect-array",
  preferEffectArrayMatcher,
  preferEffectArrayGuidance
)
