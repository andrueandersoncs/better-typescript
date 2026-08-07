import * as assert from "node:assert/strict"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import type { DetectionDetails } from "./detectionDetails.js"
import type { ExpectedDetection } from "./expectedDetection.js"
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

const detectionDetails = (element: Detection): DetectionDetails => ({
  fileName: element.location.path,
  line: element.location.line,
  column: element.location.column,
  message: element.message,
  hint: element.hint
})

const expectedDetectionDetails = (expectedElement: ExpectedDetection): DetectionDetails => ({
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
  const expected = maybeSorted(disallowedFixtureItems.map(expectedDetectionDetails), shouldSort)

  assert.deepEqual(actual, expected, "expected only disallowed fixture items to be reported")
}
