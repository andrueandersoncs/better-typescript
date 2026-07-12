import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noSwitchStatements } from "@better-typescript/checks/noSwitchStatements"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-switch-statements")
const expectedMessage = "Avoid switch statements."
const expectedHint =
  "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
  "so every case is handled explicitly."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "switch over a string union",
    fileName: "src/cases.ts",
    line: 5,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "switch over a number",
    fileName: "src/cases.ts",
    line: 19,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nested outer switch",
    fileName: "src/cases.ts",
    line: 31,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nested inner switch",
    fileName: "src/cases.ts",
    line: 33,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "if/else if chain",
    fileName: "src/allowed.ts",
    line: 5,
    column: 3
  },
  {
    name: "object/record lookup",
    fileName: "src/allowed.ts",
    line: 17,
    column: 1
  },
  {
    name: "ternary",
    fileName: "src/allowed.ts",
    line: 22,
    column: 1
  }
]

const runNoSwitchStatementsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noSwitchStatements)(project))
    )
  )

  return projectElements.flat()
}

test("no-switch-statements reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoSwitchStatementsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
