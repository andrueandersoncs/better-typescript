import { Array, HashSet } from "effect"
import { hasAmbiguousEnding } from "./hasAmbiguousEnding.js"
import { hasPluralSuffix } from "./hasPluralSuffix.js"
import { iesPluralSuffix } from "./iesPluralSuffix.js"
import { irregularPluralWords } from "./irregularPluralWords.js"
import { neutralCardinalityWords } from "./neutralCardinalityWords.js"
import { sPluralSuffix } from "./sPluralSuffix.js"

export const esPluralSuffix = hasPluralSuffix("es")(2)

export const isRegularPlural = (word: string) => {
  const ambiguous = hasAmbiguousEnding(word)
  const iesPlural = iesPluralSuffix(word)
  const esPlural = esPluralSuffix(word)
  const sPlural = sPluralSuffix(word)
  const suffixSignals = Array.make(iesPlural, esPlural, sPlural)
  const suffixPlural = Array.some(suffixSignals, Boolean)
  const checks = Array.make(!ambiguous, suffixPlural)

  return Array.every(checks, Boolean)
}

export const isConfidentlyPlural = (word: string) => {
  const neutral = HashSet.has(neutralCardinalityWords, word)
  const irregular = HashSet.has(irregularPluralWords, word)
  const regular = isRegularPlural(word)
  const pluralSignals = Array.make(irregular, regular)
  const plural = Array.some(pluralSignals, Boolean)
  const checks = Array.make(!neutral, plural)

  return Array.every(checks, Boolean)
}
