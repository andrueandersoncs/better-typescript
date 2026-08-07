import { Array, Schema } from "effect"

const preferHashSetKinds = Array.make<["constructor", "type-ref", "mutable"]>(
  "constructor",
  "type-ref",
  "mutable"
)

// PreferHashSetKind classifies Set misuse because constructor, type, and mutable advice differ.
export const PreferHashSetKind = Schema.Literals(preferHashSetKinds)

export type PreferHashSetKind = typeof PreferHashSetKind.Type

const optionalTypeName = Schema.optionalKey(Schema.String)

// PreferHashSetFact classifies Set misuse because constructor, type, and mutable advice differ.
export const PreferHashSetFact = Schema.Struct({
  kind: PreferHashSetKind,
  typeName: optionalTypeName
})

export interface PreferHashSetFact extends Schema.Schema.Type<typeof PreferHashSetFact> {}
