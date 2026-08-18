import { Array, Schema } from "effect"

const conceptRuleKinds = Array.make<
  [
    "closed-abstraction",
    "duplicate-shape",
    "function-derived-model",
    "missing-rationale",
    "parameter-bag",
    "pass-through-conversion",
    "redundant-alias",
    "speculative-export",
    "unused-field"
  ]
>(
  "closed-abstraction",
  "duplicate-shape",
  "function-derived-model",
  "missing-rationale",
  "parameter-bag",
  "pass-through-conversion",
  "redundant-alias",
  "speculative-export",
  "unused-field"
)

// conceptRuleKindSchema stays here because it owns the closed identity set for concept Rule facts.
// conceptRuleKindSchema exists because its fields form one stable data contract used by the linter.
export const conceptRuleKindSchema = Schema.Literals(conceptRuleKinds)
