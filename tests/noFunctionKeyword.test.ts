import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noFunctionKeyword } from "../src/rules/noFunctionKeyword.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-function-keyword")
const expectedMessage = "Avoid using the function keyword."
const expectedHint =
  "Declare this function as a const using fat-arrow syntax instead. Keep function " +
  "declarations only when overload signatures are required, and keep function* when " +
  "generator semantics are required."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "plainDeclaration",
    ruleId: "no-function-keyword",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "expression",
    ruleId: "no-function-keyword",
    fileName: "src/cases.ts",
    line: 7,
    column: 20,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "namedExpression",
    ruleId: "no-function-keyword",
    fileName: "src/cases.ts",
    line: 11,
    column: 25,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nestedExpression.value",
    ruleId: "no-function-keyword",
    fileName: "src/cases.ts",
    line: 16,
    column: 17,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "nestedExpression",
    fileName: "src/cases.ts",
    line: 15,
    column: 26
  },
  {
    name: "overload.stringSignature",
    fileName: "src/cases.ts",
    line: 23,
    column: 1
  },
  {
    name: "overload.numberSignature",
    fileName: "src/cases.ts",
    line: 24,
    column: 1
  },
  {
    name: "overload.implementation",
    fileName: "src/cases.ts",
    line: 25,
    column: 1
  },
  {
    name: "generatorDeclaration",
    fileName: "src/cases.ts",
    line: 29,
    column: 1
  },
  {
    name: "generatorExpression",
    fileName: "src/cases.ts",
    line: 33,
    column: 29
  },
  {
    name: "arrowFunction",
    fileName: "src/cases.ts",
    line: 37,
    column: 23
  },
  {
    name: "Service.methodDeclaration",
    fileName: "src/cases.ts",
    line: 40,
    column: 3
  }
]

const runNoFunctionKeywordFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noFunctionKeyword]))
}

test("no-function-keyword reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoFunctionKeywordFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
