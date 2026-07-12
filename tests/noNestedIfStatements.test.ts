import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noNestedIfStatements } from "@better-typescript/checks/noNestedIfStatements"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
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
  "no-nested-if-statements"
)
const expectedMessage = "Avoid nesting if statements."
const expectedHint =
  "Combine related conditions with boolean operators, or use an early return so this " +
  "condition can remain a single-level if statement."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "blockThenNesting inner if",
    fileName: "src/cases.ts",
    line: 3,
    column: 5,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "bracelessThenNesting inner if",
    fileName: "src/cases.ts",
    line: 11,
    column: 10,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "tripleThenNest first inner if (b)",
    fileName: "src/cases.ts",
    line: 17,
    column: 5,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "tripleThenNest deepest inner if (c)",
    fileName: "src/cases.ts",
    line: 18,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "elseIfChain else if",
    fileName: "src/allowed.ts",
    line: 4,
    column: 7
  },
  {
    name: "ifInsideElseBlock inner if",
    fileName: "src/allowed.ts",
    line: 15,
    column: 5
  },
  {
    name: "siblingIfs second if",
    fileName: "src/allowed.ts",
    line: 26,
    column: 3
  },
  {
    name: "scopeBoundary inner if inside arrow",
    fileName: "src/allowed.ts",
    line: 35,
    column: 7
  }
]

const runNoNestedIfStatementsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noNestedIfStatements)(project))
    )
  )

  return projectElements.flat()
}

test("no-nested-if-statements reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoNestedIfStatementsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
