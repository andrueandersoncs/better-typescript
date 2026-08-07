import type { ExpectedDetection } from "./expectedDetection.js"

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use isolated single-line comments only to explain WHY " +
  "something is done, never HOW. Block comments and JSDoc (/* ... */ and /** ... */) are " +
  "disallowed entirely. Consecutive single-line comments form a multi-line comment even when " +
  "blank lines separate them, so keep one comment per explanation. For architectural decisions " +
  "that require longer explanation, create an Architectural Decision Record (ADR) as a " +
  "markdown file in the adrs/ directory instead."

export const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
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
    line: 8,
    column: 1,
    message,
    hint
  },
  {
    name: "tags-only JSDoc on export",
    fileName: "src/cases.ts",
    line: 13,
    column: 1,
    message,
    hint
  },
  {
    name: "structured JSDoc on non-exported binding",
    fileName: "src/cases.ts",
    line: 18,
    column: 1,
    message,
    hint
  },
  {
    name: "multi-line block comment",
    fileName: "src/cases.ts",
    line: 26,
    column: 1,
    message,
    hint
  },
  {
    name: "single-line block comment",
    fileName: "src/cases.ts",
    line: 32,
    column: 1,
    message,
    hint
  },
  {
    name: "adjacent single-line comment run (2 lines)",
    fileName: "src/cases.ts",
    line: 35,
    column: 1,
    message,
    hint
  },
  {
    name: "adjacent single-line comment run (3 lines)",
    fileName: "src/cases.ts",
    line: 41,
    column: 1,
    message,
    hint
  },
  {
    name: "comment stack separated only by a blank line",
    fileName: "src/cases.ts",
    line: 46,
    column: 1,
    message,
    hint
  },
  {
    name: "comment stack after a template substitution",
    fileName: "src/cases.ts",
    line: 52,
    column: 1,
    message,
    hint
  }
]
