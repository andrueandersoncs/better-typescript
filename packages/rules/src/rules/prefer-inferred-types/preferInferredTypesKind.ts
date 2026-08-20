import { Array, Schema } from "effect"

const preferInferredTypesKinds = Array.make<["const", "return", "contextual"]>(
  "const",
  "return",
  "contextual"
)

// PreferInferredTypesKind exists because its fields form one stable data contract used by the linter.
export const PreferInferredTypesKind = Schema.Literals(preferInferredTypesKinds)

export type PreferInferredTypesKind = typeof PreferInferredTypesKind.Type
