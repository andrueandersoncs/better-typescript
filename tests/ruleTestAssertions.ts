import * as assert from "node:assert/strict"
import type { Finding } from "../src/rules/index.js"

interface SourceLocation {
  readonly fileName: string
  readonly line: number
  readonly column: number
}

export interface FixtureItem extends SourceLocation {
  readonly name: string
}

export interface MatchDetails extends SourceLocation {
  readonly ruleId: string
  readonly message: string
  readonly hint: string
}

export interface ExpectedRuleMatch extends FixtureItem {
  readonly ruleId: string
  readonly message: string
  readonly hint: string
}

interface AssertDisallowedOptions {
  readonly sort?: boolean
}

const locationKey = (location: SourceLocation): string =>
  [location.fileName, location.line, location.column].join(":")

const findingLocationKey = (match: Finding): string =>
  [match.path, match.line, match.column].join(":")

const compareLocations = (
  left: SourceLocation,
  right: SourceLocation
): number =>
  left.fileName.localeCompare(right.fileName) ||
  left.line - right.line ||
  left.column - right.column

const sortByLocation = <T extends SourceLocation>(
  items: ReadonlyArray<T>
): ReadonlyArray<T> => [...items].sort(compareLocations)

const maybeSorted = <T extends SourceLocation>(
  items: ReadonlyArray<T>,
  shouldSort: boolean
): ReadonlyArray<T> => (shouldSort ? sortByLocation(items) : items)

const matchDetails = (match: Finding): MatchDetails => ({
  ruleId: match.detectorId,
  fileName: match.path,
  line: match.line,
  column: match.column,
  message: match.message,
  hint: match.hint
})

const expectedMatchDetails = (match: ExpectedRuleMatch): MatchDetails => ({
  ruleId: match.ruleId,
  fileName: match.fileName,
  line: match.line,
  column: match.column,
  message: match.message,
  hint: match.hint
})

export const assertDisallowedFixtureItems = (
  matches: ReadonlyArray<Finding>,
  disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch>,
  options: AssertDisallowedOptions = {}
): void => {
  const shouldSort = options.sort === true
  const actual = maybeSorted(matches.map(matchDetails), shouldSort)
  const expected = maybeSorted(
    disallowedFixtureItems.map(expectedMatchDetails),
    shouldSort
  )

  assert.deepEqual(
    actual,
    expected,
    "expected only disallowed fixture items to be reported"
  )
}

export const assertAllowedFixtureItems = (
  matches: ReadonlyArray<Finding>,
  allowedFixtureItems: ReadonlyArray<FixtureItem>
): void => {
  const reportedLocations = new Set(matches.map(findingLocationKey))
  const reportedAllowedFixtureItems = allowedFixtureItems.filter((item) =>
    reportedLocations.has(locationKey(item))
  )

  assert.deepEqual(
    reportedAllowedFixtureItems,
    [],
    "expected allowed fixture items not to be reported"
  )
}
