import type { FixtureItem } from "./fixtureItem.js"

export const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "lone single-line comment",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  },
  {
    name: "isolated comment after a gap",
    fileName: "src/allowed.ts",
    line: 7,
    column: 1
  },
  {
    name: "another isolated comment",
    fileName: "src/allowed.ts",
    line: 10,
    column: 1
  },
  {
    name: "trailing comment above another trailing comment",
    fileName: "src/allowed.ts",
    line: 13,
    column: 24
  },
  {
    name: "trailing comment below another trailing comment",
    fileName: "src/allowed.ts",
    line: 14,
    column: 25
  },
  {
    name: "isolated comment after a template substitution",
    fileName: "src/allowed.ts",
    line: 17,
    column: 1
  }
]
