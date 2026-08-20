import { Layer as Layers } from "effect"
import { merge as combine, mergeAll as combineAll } from "effect/Layer"
import * as LayerModule from "effect/Layer"
import { database, repository } from "./model.js"

export const namespaceAlias = Layers.merge(repository, database) // ~detect
export const namedImport = combine(repository, database) // ~detect
export const namedMergeAll = combineAll(repository, database) // ~detect
export const moduleImport = LayerModule.merge(repository, database) // ~detect

const unrelated = {
  merge: <Left, Right>(left: Left, right: Right) => [left, right] as const,
  mergeAll: <Items extends ReadonlyArray<unknown>>(...items: Items) => items
}

export const lookalikeMerge = unrelated.merge(repository, database)
export const lookalikeMergeAll = unrelated.mergeAll(repository, database)
