import { HashSet } from "effect"

const ids = HashSet.make(1, 2, 3)
const has = HashSet.has(ids, 2)
