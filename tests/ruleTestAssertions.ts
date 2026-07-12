import * as assert from "node:assert/strict"
import type { Detection } from "../src/engine/location.js"

interface SourceLocation {
  readonly fileName: string
  readonly line: number
  readonly column: number
}

export interface FixtureItem extends SourceLocation {
  readonly name: string
}

export interface DetectionDetails extends SourceLocation {
  readonly message: string
  readonly hint: string
}

export interface ExpectedDetection extends FixtureItem {
  readonly message: string
  readonly hint: string
}

interface AssertDisallowedOptions {
  readonly sort?: boolean
}

const locationKey = (location: SourceLocation): string =>
  [location.fileName, location.line, location.column].join(":")

const detectionLocationKey = (element: Detection): string =>
  [element.location.path, element.location.line, element.location.column].join(
    ":"
  )

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

const detectionDetails = (element: Detection): DetectionDetails => ({
  fileName: element.location.path,
  line: element.location.line,
  column: element.location.column,
  message: element.message,
  hint: element.hint
})

const expectedDetectionDetails = (
  expectedElement: ExpectedDetection
): DetectionDetails => ({
  fileName: expectedElement.fileName,
  line: expectedElement.line,
  column: expectedElement.column,
  message: expectedElement.message,
  hint: expectedElement.hint
})

export const assertDisallowedFixtureItems = (
  elements: ReadonlyArray<Detection>,
  disallowedFixtureItems: ReadonlyArray<ExpectedDetection>,
  options: AssertDisallowedOptions = {}
): void => {
  const shouldSort = options.sort === true
  const actual = maybeSorted(elements.map(detectionDetails), shouldSort)
  const expected = maybeSorted(
    disallowedFixtureItems.map(expectedDetectionDetails),
    shouldSort
  )

  assert.deepEqual(
    actual,
    expected,
    "expected only disallowed fixture items to be reported"
  )
}

export const assertAllowedFixtureItems = (
  elements: ReadonlyArray<Detection>,
  allowedFixtureItems: ReadonlyArray<FixtureItem>
): void => {
  const reportedLocations = new Set(elements.map(detectionLocationKey))
  const reportedAllowedFixtureItems = allowedFixtureItems.filter((item) =>
    reportedLocations.has(locationKey(item))
  )

  assert.deepEqual(
    reportedAllowedFixtureItems,
    [],
    "expected allowed fixture items not to be reported"
  )
}
