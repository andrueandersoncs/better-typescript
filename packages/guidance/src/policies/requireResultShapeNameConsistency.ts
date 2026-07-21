import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  requireResultShapeNameConsistencyMatcher,
  type RequireResultShapeNameConsistencyFact
} from "@better-typescript/matchers/builtins/requireResultShapeNameConsistency"
import { makeBuiltinPolicy } from "../definePolicy.js"

const requireResultShapeNameConsistencyGuidance: Guidance<RequireResultShapeNameConsistencyFact> =
  () => (match) => {
    const { nameText, expected, observed, label } = match.fact

    return makeFindings(
      match.target,
      `${nameText} claims a ${expected} result via ${label}, but returns ${observed}.`,
      `Align the name with the actual result, or change the return type to ${expected}. ` +
        `Keep strong operation words only when the result shape matches.`,
      match.fact
    )
  }

export const requireResultShapeNameConsistency = makeBuiltinPolicy(
  "require-result-shape-name-consistency",
  requireResultShapeNameConsistencyMatcher,
  requireResultShapeNameConsistencyGuidance
)
