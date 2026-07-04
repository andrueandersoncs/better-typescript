import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferDirectBooleanReturn } from "../src/rules/preferDirectBooleanReturn.js"
import type { Finding } from "../src/rules/index.js"
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
  "prefer-direct-boolean-return"
)

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "passesThrough.if",
    ruleId: "prefer-direct-boolean-return",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3,
    message: "Avoid conditional return followed by return false.",
    hint: "Return a boolean expression using && instead of branching to return false."
  },
  {
    name: "compareReturned.if",
    ruleId: "prefer-direct-boolean-return",
    fileName: "src/allowed.ts",
    line: 19,
    column: 3,
    message: "Avoid conditional return followed by return false.",
    hint: "Return a boolean expression using && instead of branching to return false."
  },
  {
    name: "returnTrue.if",
    ruleId: "prefer-direct-boolean-return",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (n > 0)."
  },
  {
    name: "returnFalse.if",
    ruleId: "prefer-direct-boolean-return",
    fileName: "src/cases.ts",
    line: 11,
    column: 3,
    message: "Avoid returning false from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return !(size > 0)."
  },
  {
    name: "ifElseBooleanThen.if",
    ruleId: "prefer-direct-boolean-return",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (ready)."
  },
  {
    name: "parenthesizedTrue.if",
    ruleId: "prefer-direct-boolean-return",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (n % 2 === 1)."
  },
  {
    name: "bracelessTrue.if",
    ruleId: "prefer-direct-boolean-return",
    fileName: "src/cases.ts",
    line: 33,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (n === 0)."
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "fromElse.if",
    fileName: "src/allowed.ts",
    line: 11,
    column: 3
  },
  {
    name: "multiStatement.if",
    fileName: "src/allowed.ts",
    line: 29,
    column: 3
  },
  {
    name: "bareReturn.if",
    fileName: "src/allowed.ts",
    line: 37,
    column: 3
  }
]

const runPreferDirectBooleanReturnFixture = async (): Promise<
  ReadonlyArray<Finding>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferDirectBooleanReturn])(project)
  )
}

test("prefer-direct-boolean-return reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferDirectBooleanReturnFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
