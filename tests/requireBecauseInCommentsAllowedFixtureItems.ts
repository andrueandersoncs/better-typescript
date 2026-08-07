import type { FixtureItem } from "./fixtureItem.js"

export const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "case-insensitive because",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  },
  {
    name: "block comment with because",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "trailing comment with because",
    fileName: "src/allowed.ts",
    line: 7,
    column: 34
  },
  {
    name: "because comment after a template substitution",
    fileName: "src/allowed.ts",
    line: 14,
    column: 1
  }
]
