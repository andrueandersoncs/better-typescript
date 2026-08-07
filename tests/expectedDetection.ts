import type { FixtureItem } from "./fixtureItem.js"

export interface ExpectedDetection extends FixtureItem {
  readonly message: string
  readonly hint: string
}
