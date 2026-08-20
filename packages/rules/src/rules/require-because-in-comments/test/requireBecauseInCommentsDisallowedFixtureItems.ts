import type { ExpectedViolation } from "../../../../../../tests/expectedViolation.js"

const message = 'Comments must explain why using the word "because".'

const hint = "Delete the comment if it does not explain a reason."

export const disallowedFixtureItems: ReadonlyArray<ExpectedViolation> = [
  {
    name: "structured JSDoc on exported API",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message,
    hint
  },
  {
    name: "description-only JSDoc on export",
    fileName: "src/cases.ts",
    line: 7,
    column: 1,
    message,
    hint
  },
  {
    name: "tags-only JSDoc on export",
    fileName: "src/cases.ts",
    line: 12,
    column: 1,
    message,
    hint
  },
  {
    name: "structured JSDoc on non-exported binding",
    fileName: "src/cases.ts",
    line: 17,
    column: 1,
    message,
    hint
  },
  {
    name: "line comment without because",
    fileName: "src/cases.ts",
    line: 25,
    column: 1,
    message,
    hint
  },
  {
    name: "block comment without because",
    fileName: "src/cases.ts",
    line: 28,
    column: 1,
    message,
    hint
  },
  {
    name: "trailing comment without because",
    fileName: "src/cases.ts",
    line: 31,
    column: 34,
    message,
    hint
  },
  {
    name: "because as part of another word",
    fileName: "src/cases.ts",
    line: 33,
    column: 32,
    message,
    hint
  },
  {
    name: "comment after comment-like literal text",
    fileName: "src/cases.ts",
    line: 39,
    column: 35,
    message,
    hint
  },
  {
    name: "comment inside an empty block",
    fileName: "src/cases.ts",
    line: 42,
    column: 3,
    message,
    hint
  },
  {
    name: "because in a longer Unicode word",
    fileName: "src/cases.ts",
    line: 45,
    column: 39,
    message,
    hint
  },
  {
    name: "empty block comment is not JSDoc",
    fileName: "src/cases.ts",
    line: 46,
    column: 1,
    message,
    hint
  },
  {
    name: "end-of-file comment without because",
    fileName: "src/cases.ts",
    line: 50,
    column: 1,
    message,
    hint
  },
  {
    name: "comment after a template substitution without because",
    fileName: "src/cases.ts",
    line: 53,
    column: 1,
    message,
    hint
  }
]
