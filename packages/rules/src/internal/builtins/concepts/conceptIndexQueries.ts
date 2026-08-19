import { Array, HashMap, HashSet, Option, Struct, flow, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import type { DataStructureEntry } from "./conceptIndex.js"
import type { ConceptIndex } from "./conceptIndex.js"
import type { ModelRole } from "./modelRole.js"

export const entriesForContext = (index: ConceptIndex) => (context: MatchContext) => {
  const sourceFile = Struct.get<DataStructureEntry, "sourceFile">("sourceFile")
  const entryInSourceFile = flow(sourceFile, strictEqual(context.sourceFile))

  return Array.filter(index.dataStructures, entryInSourceFile)
}

export const rolesFor =
  (index: ConceptIndex) =>
  (entry: DataStructureEntry): HashSet.HashSet<ModelRole> => {
    const symbolKey = referenceKey(entry.symbol)

    return pipe(HashMap.get(index.rolesByData, symbolKey), Option.getOrElse(HashSet.empty))
  }
