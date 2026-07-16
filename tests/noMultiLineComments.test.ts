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
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. JSDoc (/** ... */) is permitted only when it documents " +
  "an exported API with a description and at least one tag (such as @param, @returns, or " +
  "@remarks). For architectural decisions that require longer explanation, create an " +
  "Architectural Decision Record (ADR) as a markdown file in the adrs/ directory instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
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
    name: "adjacent single-line comment run (2 lines)",
    fileName: "src/cases.ts",
    line: 32,
    column: 1,
    message,
    hint
  },
  {
    name: "adjacent single-line comment run (3 lines)",
    fileName: "src/cases.ts",
    line: 38,
    column: 1,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "structured JSDoc on exported API",
    fileName: "src/cases.ts",
    line: 1,
    column: 1
  },
  {
    name: "single-line block comment",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  },
  {
    name: "lone single-line comment",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "isolated comment after gap",
    fileName: "src/allowed.ts",
    line: 10,
    column: 1
  },
  {
    name: "another isolated comment",
    fileName: "src/allowed.ts",
    line: 13,
    column: 1
  }
]

const runNoMultiLineCommentsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(noMultiLineComments.check))(project))
    )
  )

  return projectElements.flat()
}

test("no-multi-line-comments reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoMultiLineCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
