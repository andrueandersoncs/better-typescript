import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  requireResultShapeNameConsistencyMatcher,
  type RequireResultShapeNameConsistencyFact
} from "@better-typescript/matchers/builtins/requireResultShapeNameConsistency"
import { defineBuiltinPolicy } from "../definePolicy.js"

const requireResultShapeNameConsistencyGuidance: Guidance<RequireResultShapeNameConsistencyFact> =
  () => (match) => {
    const { nameText, expected, observed, label } = match.fact

    return oneFinding(
      match.target,
      `${nameText} claims a ${expected} result via ${label}, but returns ${observed}.`,
      `Align the name with the actual result, or change the return type to ${expected}. ` +
        `Keep strong operation words only when the result shape matches.`,
      match.fact
    )
  }

export const requireResultShapeNameConsistency = defineBuiltinPolicy(
  "require-result-shape-name-consistency",
  requireResultShapeNameConsistencyMatcher,
  requireResultShapeNameConsistencyGuidance
)
