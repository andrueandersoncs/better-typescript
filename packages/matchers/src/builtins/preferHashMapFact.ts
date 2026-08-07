import { Array, Schema } from "effect"

const preferHashMapKinds = Array.make<["constructor", "type-ref", "mutable"]>(
  "constructor",
  "type-ref",
  "mutable"
)

// PreferHashMapKind classifies Map misuse because constructor, type, and mutable advice differ.
export const PreferHashMapKind = Schema.Literals(preferHashMapKinds)

export type PreferHashMapKind = typeof PreferHashMapKind.Type

const optionalTypeName = Schema.optionalKey(Schema.String)

// PreferHashMapFact classifies Map misuse because constructor, type, and mutable advice differ.
export const PreferHashMapFact = Schema.Struct({
  kind: PreferHashMapKind,
  typeName: optionalTypeName
})

export interface PreferHashMapFact extends Schema.Schema.Type<typeof PreferHashMapFact> {}
