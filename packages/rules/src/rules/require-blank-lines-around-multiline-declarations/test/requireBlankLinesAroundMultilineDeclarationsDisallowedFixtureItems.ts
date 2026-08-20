import type { ExpectedViolation } from "../../../../test/expectedViolation.js"

const message = "Multi-line declarations must have a blank line above and below."

const hint =
  "Insert an empty line before and after this declaration so its multi-line shape " +
  "is visually separated from neighboring statements. Single-line declarations do " +
  "not need surrounding blank lines; the first and last statements in a block are " +
  "exempt on the outer sides."

export const disallowedFixtureItems: ReadonlyArray<ExpectedViolation> = [
  {
    name: "crowded multi-line const reduce",
    fileName: "src/cases.ts",
    line: 13,
    column: 3,
    message,
    hint
  },
  {
    name: "crowded multi-line type alias",
    fileName: "src/cases.ts",
    line: 23,
    column: 1,
    message,
    hint
  },
  {
    name: "crowded multi-line interface",
    fileName: "src/cases.ts",
    line: 29,
    column: 1,
    message,
    hint
  }
]
