import { Array } from "effect"
import { makeHashCollectionPreferScanner } from "./hashCollectionMatches.js"
import { PreferHashMapFact } from "./preferHashMapFact.js"

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

export const preferHashMapScanner =
  makeHashCollectionPreferScanner<PreferHashMapFact>(hashMapNames)(constructorFact)(
    makeHashMapTypeRefFact
  )(mutableFact)
