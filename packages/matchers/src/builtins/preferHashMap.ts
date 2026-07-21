import { Array, Schema } from "effect"
import { makeHashCollectionPreferMatcher } from "./hashCollectionMatches.js"

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

const mapTypeNames: ReadonlyArray<string> = Array.make("Map", "ReadonlyMap")

const hashMapNames = {
  collectionName: "Map",
  typeNames: mapTypeNames,
  mutableModuleName: "effect/MutableHashMap",
  mutableName: "MutableHashMap"
}

const makeHashMapTypeRefFact = (typeName: string) =>
  PreferHashMapFact.make({ kind: "type-ref", typeName })

const constructorFact = PreferHashMapFact.make({ kind: "constructor" })
const mutableFact = PreferHashMapFact.make({ kind: "mutable" })

export const preferHashMapMatcher = makeHashCollectionPreferMatcher(
  hashMapNames,
  constructorFact,
  makeHashMapTypeRefFact,
  mutableFact
)
