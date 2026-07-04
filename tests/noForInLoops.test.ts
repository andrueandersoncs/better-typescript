import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noForInLoops } from "../src/rules/noForInLoops.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-for-in-loops")
const expectedMessage = "Avoid imperative logic in for..in loops."
const expectedHint =
  "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
  "or Record.toEntries(), instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "sumRecord.forInLoop",
    ruleId: "no-for-in-loops",
    fileName: "src/cases.ts",
    line: 6,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "copyRecord.forInLoop",
    ruleId: "no-for-in-loops",
    fileName: "src/cases.ts",
    line: 16,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "recordOperationsAreAllowed",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  }
]

const runNoForInLoopsFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noForInLoops])(project)
  )
}

test("no-for-in-loops reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoForInLoopsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
