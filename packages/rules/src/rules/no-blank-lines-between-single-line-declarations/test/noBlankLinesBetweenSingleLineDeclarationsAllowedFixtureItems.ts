import type { FixtureItem } from "../../../../test/fixtureItem.js"

export const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "contiguous single-line neighbors",
    fileName: "src/allowed.ts",
    line: 13,
    column: 3
  },
  {
    name: "single-line after blank around multiline",
    fileName: "src/allowed.ts",
    line: 27,
    column: 3
  },
  {
    name: "module-level single-line after gap",
    fileName: "src/allowed.ts",
    line: 34,
    column: 1
  },
  {
    name: "contiguous nested single-line neighbors",
    fileName: "src/allowed.ts",
    line: 39,
    column: 5
  }
]
