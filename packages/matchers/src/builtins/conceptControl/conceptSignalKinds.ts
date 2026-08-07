import { Array, Schema } from "effect"

const conceptSignalKinds = Array.make<
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

// conceptSignalKindSchema is the closed kind set because detections share one enum.
export const conceptSignalKindSchema = Schema.Literals(conceptSignalKinds)
