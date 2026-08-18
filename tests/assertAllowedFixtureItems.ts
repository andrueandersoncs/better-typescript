import * as assert from "node:assert/strict"
import type { Violation } from "@better-typescript/core/linter"
import type { FixtureItem } from "./fixtureItem.js"
import type { SourceLocation } from "./sourceLocation.js"
import { violationLocationKey } from "./violationLocationKey.js"

const locationKey = (location: SourceLocation): string =>
  [location.fileName, location.line, location.column].join(":")

export const assertAllowedFixtureItems = (
  elements: ReadonlyArray<Violation>,
  allowedFixtureItems: ReadonlyArray<FixtureItem>
): void => {
  const reportedLocations = new Set(elements.map(violationLocationKey))
  const reportedAllowedFixtureItems = allowedFixtureItems.filter((item) =>
    reportedLocations.has(locationKey(item))
  )

  assert.deepEqual(
    reportedAllowedFixtureItems,
    [],
    "expected allowed fixture items not to be reported"
  )
}
