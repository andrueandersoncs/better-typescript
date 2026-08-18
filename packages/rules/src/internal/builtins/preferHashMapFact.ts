import { Array, Schema } from "effect"

const preferHashMapKinds = Array.make<["constructor", "type-ref", "mutable"]>(
  "constructor",
  "type-ref",
  "mutable"
)

// PreferHashMapKind exists because its fields form one stable data contract used by the linter.
export const PreferHashMapKind = Schema.Literals(preferHashMapKinds)

export type PreferHashMapKind = typeof PreferHashMapKind.Type

const optionalTypeName = Schema.optionalKey(Schema.String)

// PreferHashMapFact exists because its fields form one stable data contract used by the linter.
export const PreferHashMapFact = Schema.Struct({
  kind: PreferHashMapKind,
  typeName: optionalTypeName
})

export interface PreferHashMapFact extends Schema.Schema.Type<typeof PreferHashMapFact> {}
