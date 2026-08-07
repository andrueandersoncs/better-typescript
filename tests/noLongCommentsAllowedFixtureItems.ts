import type { FixtureItem } from "./fixtureItem.js"

export const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "comment exactly at the limit",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  },
  {
    name: "short comment",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "capped comment after a template substitution",
    fileName: "src/allowed.ts",
    line: 8,
    column: 1
  }
]
