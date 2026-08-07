import * as assert from "node:assert/strict"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import type { FixtureItem } from "./fixtureItem.js"
import type { SourceLocation } from "./sourceLocation.js"
import { detectionLocationKey } from "./detectionLocationKey.js"

const locationKey = (location: SourceLocation): string =>
  [location.fileName, location.line, location.column].join(":")

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
