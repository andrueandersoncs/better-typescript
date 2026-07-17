import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noMultiLineComments } from "@better-typescript/checks/noMultiLineComments"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-multi-line-comments")

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use isolated single-line comments only to explain WHY " +
  "something is done, never HOW. Block comments and JSDoc (/* ... */ and /** ... */) are " +
  "disallowed entirely. Consecutive single-line comments form a multi-line comment even when " +
  "blank lines separate them, so keep one comment per explanation. For architectural decisions " +
  "that require longer explanation, create an Architectural Decision Record (ADR) as a " +
  "markdown file in the adrs/ directory instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
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

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
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

const runNoMultiLineCommentsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const named = await Effect.runPromise(noMultiLineComments)
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(named.check))(project))
    )
  )

  return projectElements.flat()
}

test("no-multi-line-comments reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoMultiLineCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
