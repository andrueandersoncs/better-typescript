import { Array, HashSet } from "effect"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"

export const vagueOperations = HashSet.make("do", "execute", "handle", "manage", "process", "run")

export const isVagueOperation = (word: string) => HashSet.has(vagueOperations, word)

export const claimedVagueOperation = (semantics: CallableSemantics) =>
  Array.findFirst(semantics.name.words, isVagueOperation)
