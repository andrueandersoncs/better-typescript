import type { FixtureItem } from "../../../../test/fixtureItem.js"

export const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "spaced multi-line const reduce",
    fileName: "src/allowed.ts",
    line: 14,
    column: 3
  },
  {
    name: "single-line neighbors",
    fileName: "src/allowed.ts",
    line: 26,
    column: 3
  },
  {
    name: "spaced multi-line type alias",
    fileName: "src/allowed.ts",
    line: 32,
    column: 1
  },
  {
    name: "spaced multi-line interface",
    fileName: "src/allowed.ts",
    line: 39,
    column: 1
  },
  {
    name: "sole multi-line declaration in block",
    fileName: "src/allowed.ts",
    line: 46,
    column: 3
  }
]
