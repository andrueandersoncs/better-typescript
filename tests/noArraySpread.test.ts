import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noArraySpread } from "../src/rules/noArraySpread.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-array-spread")
const expectedMessage =
  "Avoid the array-spread operator when constructing arrays."
const expectedHint =
  "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
  "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
  "and Array.fromIterable to materialize an iterable."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "first spread of two combined",
    ruleId: "no-array-spread",
    fileName: "src/cases.ts",
    line: 7,
    column: 19,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "second spread of two combined",
    ruleId: "no-array-spread",
    fileName: "src/cases.ts",
    line: 7,
    column: 28,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "leading spread with trailing element",
    ruleId: "no-array-spread",
    fileName: "src/cases.ts",
    line: 9,
    column: 19,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "leading element with trailing spread",
    ruleId: "no-array-spread",
    fileName: "src/cases.ts",
    line: 11,
    column: 25,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "spread surrounded by elements",
    ruleId: "no-array-spread",
    fileName: "src/cases.ts",
    line: 13,
    column: 27,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "lone spread",
    ruleId: "no-array-spread",
    fileName: "src/cases.ts",
    line: 15,
    column: 23,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "parenthesized inner expression",
    ruleId: "no-array-spread",
    fileName: "src/cases.ts",
    line: 17,
    column: 30,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "spread in function call",
    fileName: "src/allowed.ts",
    line: 6,
    column: 29
  },
  {
    name: "array literal without spread",
    fileName: "src/allowed.ts",
    line: 8,
    column: 44
  },
  {
    name: "empty array literal",
    fileName: "src/allowed.ts",
    line: 10,
    column: 45
  },
  {
    name: "literal with no spread elements",
    fileName: "src/allowed.ts",
    line: 12,
    column: 49
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  return workspace.projects.flatMap((project) =>
    runRules([noArraySpread])(project)
  )
}

test("no-array-spread reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()
  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
