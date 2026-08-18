import { Array, Schema } from "effect"

const preferHashSetKinds = Array.make<["constructor", "type-ref", "mutable"]>(
  "constructor",
  "type-ref",
  "mutable"
)

// PreferHashSetKind exists because its fields form one stable data contract used by the linter.
export const PreferHashSetKind = Schema.Literals(preferHashSetKinds)

export type PreferHashSetKind = typeof PreferHashSetKind.Type

const optionalTypeName = Schema.optionalKey(Schema.String)

// PreferHashSetFact exists because its fields form one stable data contract used by the linter.
export const PreferHashSetFact = Schema.Struct({
  kind: PreferHashSetKind,
  typeName: optionalTypeName
})

export interface PreferHashSetFact extends Schema.Schema.Type<typeof PreferHashSetFact> {}
