import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMultipleBooleanOperators } from "../src/rules/noMultipleBooleanOperators.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "no-multiple-boolean-operators"
)
const expectedMessage =
  "Avoid combining more than one boolean operator in a single expression."
const expectedHint =
  "Declare multiple constant variables instead of combining operators into a " +
  "single expression."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "two ands",
    ruleId: "no-multiple-boolean-operators",
    fileName: "src/cases.ts",
    line: 13,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "mixed and or",
    ruleId: "no-multiple-boolean-operators",
    fileName: "src/cases.ts",
    line: 16,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "strict equal combined with and",
    ruleId: "no-multiple-boolean-operators",
    fileName: "src/cases.ts",
    line: 19,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "double negation",
    ruleId: "no-multiple-boolean-operators",
    fileName: "src/cases.ts",
    line: 22,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nested ternary",
    ruleId: "no-multiple-boolean-operators",
    fileName: "src/cases.ts",
    line: 25,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "single operator",
    fileName: "src/allowed.ts",
    line: 13,
    column: 12
  },
  {
    name: "single ternary",
    fileName: "src/allowed.ts",
    line: 16,
    column: 12
  },
  {
    name: "single negation",
    fileName: "src/allowed.ts",
    line: 19,
    column: 12
  },
  {
    name: "non-counted less-than operators",
    fileName: "src/allowed.ts",
    line: 22,
    column: 12
  },
  {
    name: "non-counted double-equal operator",
    fileName: "src/allowed.ts",
    line: 25,
    column: 12
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  return workspace.projects.flatMap((project) =>
    runRules([noMultipleBooleanOperators])(project)
  )
}

test("no-multiple-boolean-operators reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()
  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
