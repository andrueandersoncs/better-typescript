import { Array } from "effect"
import { endsWithSuffix } from "./endsWithSuffix.js"

export const longerThan = (minimum: number) => (word: string) => word.length > minimum

export const hasPluralSuffix = (suffix: string) => (minimumLength: number) => (word: string) => {
  const endingMatches = endsWithSuffix(word)(suffix)
  const lengthMatches = longerThan(minimumLength)(word)
  const checks = Array.make(endingMatches, lengthMatches)

  return Array.every(checks, Boolean)
}
