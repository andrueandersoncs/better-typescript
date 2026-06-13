import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noForOfLoops } from "../src/rules/noForOfLoops.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-for-of-loops")
const expectedMessage = "Avoid imperative logic in for..of loops."
const expectedHint =
  "Use immutable collection logic such as Array.prototype.map(), " +
  "Array.prototype.reduce(), Array.prototype.filter(), Array.prototype.flatMap(), " +
  "or Streams for async iterables instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "collectValues.forOfLoop",
    ruleId: "no-for-of-loops",
    fileName: "src/cases.ts",
    line: 6,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "collectAsyncValues.forAwaitOfLoop",
    ruleId: "no-for-of-loops",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "collectionOperationsAreAllowed",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  }
]

const runNoForOfLoopsFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noForOfLoops]))
}

test("no-for-of-loops reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoForOfLoopsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
