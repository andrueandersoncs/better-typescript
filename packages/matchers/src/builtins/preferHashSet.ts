import { Array } from "effect"
import { makeHashCollectionPreferMatcher } from "./hashCollectionMatches.js"
import { PreferHashSetFact } from "./preferHashSetFact.js"

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
