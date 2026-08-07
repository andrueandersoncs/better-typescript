import { HashMap } from "effect"
import { countAt } from "./countAt.js"

export const addCount = (key: string) => (counts: HashMap.HashMap<string, number>) => {
  const next = countAt(counts)(key) + 1

  return HashMap.set(counts, key, next)
}
