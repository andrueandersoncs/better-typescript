import { Array, Schema } from "effect"

const preferInferredTypesKinds = Array.make<["const", "return", "contextual"]>(
  "const",
  "return",
  "contextual"
)

// PreferInferredTypesKind classifies inference sites because annotation advice differs.
export const PreferInferredTypesKind = Schema.Literals(preferInferredTypesKinds)

export type PreferInferredTypesKind = typeof PreferInferredTypesKind.Type
