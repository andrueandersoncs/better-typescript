import { HashSet } from "effect"

declare const loadIds: () => Set<number>

const ids = loadIds()

export const idSet = HashSet.fromIterable(ids)
