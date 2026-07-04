import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noSwitchStatements } from "../src/rules/noSwitchStatements.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-switch-statements")
const expectedMessage = "Avoid switch statements."
const expectedHint =
  "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
  "so every case is handled explicitly."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "switch over a string union",
    ruleId: "no-switch-statements",
    fileName: "src/cases.ts",
    line: 5,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "switch over a number",
    ruleId: "no-switch-statements",
    fileName: "src/cases.ts",
    line: 19,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nested outer switch",
    ruleId: "no-switch-statements",
    fileName: "src/cases.ts",
    line: 31,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nested inner switch",
    ruleId: "no-switch-statements",
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
  ReadonlyArray<Finding>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noSwitchStatements])(project)
  )
}

test("no-switch-statements reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoSwitchStatementsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
