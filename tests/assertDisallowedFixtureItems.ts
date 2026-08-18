import * as assert from "node:assert/strict"
import type { Violation } from "@better-typescript/core/linter"
import type { ViolationDetails } from "./violationDetails.js"
import type { ExpectedViolation } from "./expectedViolation.js"
import type { SourceLocation } from "./sourceLocation.js"

interface AssertDisallowedOptions {
  readonly sort?: boolean
}

const compareLocations = (left: SourceLocation, right: SourceLocation): number =>
  left.fileName.localeCompare(right.fileName) ||
  left.line - right.line ||
  left.column - right.column

const sortByLocation = <T extends SourceLocation>(items: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...items].sort(compareLocations)

const maybeSorted = <T extends SourceLocation>(
  items: ReadonlyArray<T>,
  shouldSort: boolean
): ReadonlyArray<T> => (shouldSort ? sortByLocation(items) : items)

const violationDetails = (element: Violation): ViolationDetails => ({
  fileName: element.filePath,
  line: element.line,
  column: element.column,
  message: element.message
})

const expectedViolationDetails = (expectedElement: ExpectedViolation): ViolationDetails => ({
  fileName: expectedElement.fileName,
  line: expectedElement.line,
  column: expectedElement.column,
  message: `${expectedElement.message} ${expectedElement.hint}`
})

export const assertDisallowedFixtureItems = (
  elements: ReadonlyArray<Violation>,
  disallowedFixtureItems: ReadonlyArray<ExpectedViolation>,
  options: AssertDisallowedOptions = {}
): void => {
  const shouldSort = options.sort === true
  const actual = maybeSorted(elements.map(violationDetails), shouldSort)
  const expected = maybeSorted(disallowedFixtureItems.map(expectedViolationDetails), shouldSort)

  assert.deepEqual(actual, expected, "expected only disallowed fixture items to be reported")
}
