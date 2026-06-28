import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noForLoops } from "../src/rules/noForLoops.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-for-loops")
const expectedMessage = "Avoid imperative logic in iterator-based for loops."
const expectedHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "doubleValues.iteratorLoop",
    ruleId: "no-for-loops",
    fileName: "src/cases.ts",
    line: 6,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "sumValues.iteratorLoop",
    ruleId: "no-for-loops",
    fileName: "src/cases.ts",
    line: 17,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "loopsWithoutIteratorsAreAllowed.unconditionalLoop",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3
  },
  {
    name: "loopsWithoutIteratorsAreAllowed.conditionOnlyLoop",
    fileName: "src/allowed.ts",
    line: 10,
    column: 3
  }
]

const runNoForLoopsFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [noForLoops])
  )
}

test("no-for-loops reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoForLoopsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
