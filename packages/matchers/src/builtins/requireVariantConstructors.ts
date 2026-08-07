import { Array, HashSet, Option, pipe } from "effect"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import { strictEqual } from "../equivalence.js"

export const variantConstructors = HashSet.make(
  "fail",
  "left",
  "none",
  "of",
  "right",
  "some",
  "succeed"
)

export const isExactSingleWord = (word: string) => (semantics: CallableSemantics) => {
  const singleWord = strictEqual(1)(semantics.name.words.length)
  const firstWord = Array.head(semantics.name.words)
  const matchesWord = Option.contains(firstWord, word)
  const conditions = Array.make(singleWord, matchesWord)

  return Array.every(conditions, Boolean)
}

export const isBareMake = isExactSingleWord("make")

export const isExactVariantConstructor = (semantics: CallableSemantics) => {
  const singleWord = strictEqual(1)(semantics.name.words.length)

  const isKnownVariantWord = (word: string) => {
    const knownVariant = HashSet.has(variantConstructors, word)
    const conditions = Array.make(singleWord, knownVariant)

    return Array.every(conditions, Boolean)
  }

  return pipe(Array.head(semantics.name.words), Option.exists(isKnownVariantWord))
}

export const isAllowedConstructionName = (semantics: CallableSemantics) => {
  const bareMake = isBareMake(semantics)
  const exactVariant = isExactVariantConstructor(semantics)
  const checks = Array.make(bareMake, exactVariant)

  return Array.some(checks, Boolean)
}
