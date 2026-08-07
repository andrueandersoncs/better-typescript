import { HashSet, Array } from "effect"

export const hasWord = (words: ReadonlyArray<string>) => (candidates: HashSet.HashSet<string>) => {
  const wordInCandidates = (word: string) => HashSet.has(candidates, word)

  return Array.some(words, wordInCandidates)
}
