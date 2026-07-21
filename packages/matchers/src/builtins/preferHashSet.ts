import { Array, Schema } from "effect"
import { makeHashCollectionPreferMatcher } from "./hashCollectionMatches.js"

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

const setTypeNames: ReadonlyArray<string> = Array.make("Set", "ReadonlySet")

const hashSetNames = {
  collectionName: "Set",
  typeNames: setTypeNames,
  mutableModuleName: "effect/MutableHashSet",
  mutableName: "MutableHashSet"
}

const makeHashSetTypeRefFact = (typeName: string) =>
  PreferHashSetFact.make({ kind: "type-ref", typeName })

const constructorFact = PreferHashSetFact.make({ kind: "constructor" })
const mutableFact = PreferHashSetFact.make({ kind: "mutable" })

export const preferHashSetMatcher = makeHashCollectionPreferMatcher(
  hashSetNames,
  constructorFact,
  makeHashSetTypeRefFact,
  mutableFact
)
