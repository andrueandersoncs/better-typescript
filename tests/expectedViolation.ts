import type { FixtureItem } from "./fixtureItem.js"

export interface ExpectedViolation extends FixtureItem {
  readonly message: string
  readonly hint: string
}
