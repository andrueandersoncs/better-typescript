import { Array, Function, Option, Predicate, pipe } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleRecord } from "./semanticModuleRecord.js"
import { SemanticModuleSnapshotV1 } from "./semanticModuleSnapshotV1.js"
import { entityKeyMatches } from "./entityKeyMatches.js"
import { containsEntity } from "./containsEntity.js"

export const peersInModule = (key: SemanticModuleEntityKey) => (module: SemanticModuleRecord) => {
  const differsFromKey = Predicate.not(entityKeyMatches(key))
  const peers = Array.filter(module.members, differsFromKey)

  return Object.freeze(peers)
}

export const peersFor = Function.dual<
  (
    key: SemanticModuleEntityKey
  ) => (
    snapshot: SemanticModuleSnapshotV1
  ) => Option.Option<ReadonlyArray<SemanticModuleEntityKey>>,
  (
    snapshot: SemanticModuleSnapshotV1,
    key: SemanticModuleEntityKey
  ) => Option.Option<ReadonlyArray<SemanticModuleEntityKey>>
>(2, (snapshot, key) =>
  pipe(snapshot.modules, Array.findFirst(containsEntity(key)), Option.map(peersInModule(key)))
)
