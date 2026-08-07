import { HashSet } from "effect"

export const modifierWords = HashSet.make(
  "all",
  "async",
  "effect",
  "maybe",
  "optional",
  "try",
  "uncached",
  "unsafe"
)
