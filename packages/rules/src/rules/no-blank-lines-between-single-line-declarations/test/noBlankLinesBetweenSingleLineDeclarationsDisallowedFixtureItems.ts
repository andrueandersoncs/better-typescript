import type { ExpectedViolation } from "../../../../../../tests/expectedViolation.js"

const message = "Single-line declarations must not have blank lines between them."

const hint =
  "Remove the empty line between these adjacent single-line declarations so they " +
  "stay contiguous. Blank lines remain required around multi-line declarations; " +
  "keep those separators when a neighbor is multi-line."

export const disallowedFixtureItems: ReadonlyArray<ExpectedViolation> = [
  {
    name: "spaced single-line neighbors",
    fileName: "src/cases.ts",
    line: 14,
    column: 3,
    message,
    hint
  },
  {
    name: "spaced single-line before multiline cluster",
    fileName: "src/cases.ts",
    line: 22,
    column: 3,
    message,
    hint
  },
  {
    name: "spaced single-line neighbors in nested block",
    fileName: "src/cases.ts",
    line: 37,
    column: 5,
    message,
    hint
  }
]
