import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMultiLineComments } from "../src/checks/noMultiLineComments.js"
import type { Detection } from "../src/engine/check.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "no-multi-line-comments"
)

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. JSDoc (/** ... */) documenting an exported API is " +
  "permitted. For architectural decisions that require longer explanation, create an " +
  "Architectural Decision Record (ADR) as a markdown file in the adrs/ directory instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "multi-line block comment",
    fileName: "src/cases.ts",
    line: 6,
    column: 1,
    message,
    hint
  },
  {
    name: "adjacent single-line comment run (2 lines)",
    fileName: "src/cases.ts",
    line: 12,
    column: 1,
    message,
    hint
  },
  {
    name: "adjacent single-line comment run (3 lines)",
    fileName: "src/cases.ts",
    line: 18,
    column: 1,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "JSDoc block comment",
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

const runNoMultiLineCommentsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noMultiLineComments)(project))
    )
  )

  return projectElements.flat()
}

test("no-multi-line-comments reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoMultiLineCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
