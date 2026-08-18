import { strictEqual } from "../equivalence.js"
import { Array } from "effect"

export const esPluralSuffixes = Array.make("s", "x", "z", "ch", "sh")

export const hasEsPluralSuffix = (word: string) => {
  const matchesPluralSuffix = (suffix: string) => word.endsWith(suffix)

  return Array.some(esPluralSuffixes, matchesPluralSuffix)
}

export const wordsMatch =
  (expected: string) =>
  (actual: string): boolean => {
    const exact = strictEqual(expected)(actual)
    const actualIsPlural = strictEqual(`${expected}s`)(actual)
    const expectedIsPlural = strictEqual(`${actual}s`)(expected)
    const expectedSupportsEsPlural = hasEsPluralSuffix(expected)
    const actualMatchesExpectedEsPlural = strictEqual(`${expected}es`)(actual)
    const actualEsPluralChecks = Array.make(expectedSupportsEsPlural, actualMatchesExpectedEsPlural)
    const actualIsEsPlural = Array.every(actualEsPluralChecks, Boolean)
    const actualSupportsEsPlural = hasEsPluralSuffix(actual)
    const expectedMatchesActualEsPlural = strictEqual(`${actual}es`)(expected)
    const expectedEsPluralChecks = Array.make(actualSupportsEsPlural, expectedMatchesActualEsPlural)
    const expectedIsEsPlural = Array.every(expectedEsPluralChecks, Boolean)
    const expectedEndsInY = expected.endsWith("y")
    const actualEndsInIes = actual.endsWith("ies")
    const expectedStem = expected.slice(0, -1)
    const actualStem = actual.slice(0, -3)
    const stemsMatchActualYPlural = strictEqual(actualStem)(expectedStem)

    const actualYPluralChecks = Array.make(
      expectedEndsInY,
      actualEndsInIes,
      stemsMatchActualYPlural
    )

    const actualIsYPlural = Array.every(actualYPluralChecks, Boolean)
    const actualEndsInY = actual.endsWith("y")
    const expectedEndsInIes = expected.endsWith("ies")
    const actualSingularStem = actual.slice(0, -1)
    const expectedPluralStem = expected.slice(0, -3)
    const stemsMatchExpectedYPlural = strictEqual(expectedPluralStem)(actualSingularStem)

    const expectedYPluralChecks = Array.make(
      actualEndsInY,
      expectedEndsInIes,
      stemsMatchExpectedYPlural
    )

    const expectedIsYPlural = Array.every(expectedYPluralChecks, Boolean)

    const checks = Array.make(
      exact,
      actualIsPlural,
      expectedIsPlural,
      actualIsEsPlural,
      expectedIsEsPlural,
      actualIsYPlural,
      expectedIsYPlural
    )

    return Array.some(checks, Boolean)
  }
