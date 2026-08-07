import type { ExpectedDetection } from "./expectedDetection.js"

const message = "Comments must be at most 100 characters."

const hint =
  "Keep each comment within 100 characters because longer comments stop reading as code " +
  "annotations. State the single load-bearing reason; move longer explanations into an " +
  "Architectural Decision Record (ADR) in the adrs/ directory instead."

export const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "comment one character over the limit",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message,
    hint
  },
  {
    name: "trailing comment over the limit",
    fileName: "src/cases.ts",
    line: 4,
    column: 25,
    message,
    hint
  },
  {
    name: "comment far over the limit",
    fileName: "src/cases.ts",
    line: 6,
    column: 1,
    message,
    hint
  },
  {
    name: "overlong comment after a template substitution",
    fileName: "src/cases.ts",
    line: 10,
    column: 1,
    message,
    hint
  }
]
