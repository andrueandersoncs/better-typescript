import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noCallbacks } from "../src/rules/noCallbacks.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-callbacks")
const expectedMessage =
  "Avoid callback-style functions that accept a function argument and return void."
const expectedHint =
  "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
  "own API as an Effect-returning function from the start."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "functionDeclaration",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "functionExpression",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 7,
    column: 28,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "arrowFunction",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 11,
    column: 23,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Service.methodDeclaration",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 16,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "ServiceContract.methodSignature",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 22,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "CallableContract.callSignature",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "FunctionTypeAlias",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 29,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "functionTypeValue",
    ruleId: "no-callbacks",
    fileName: "src/cases.ts",
    line: 32,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Handler",
    fileName: "src/shared.ts",
    line: 1,
    column: 23
  },
  {
    name: "returnsValue",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  },
  {
    name: "acceptsValue",
    fileName: "src/allowed.ts",
    line: 8,
    column: 1
  },
  {
    name: "FunctionTypeReturnsValue",
    fileName: "src/allowed.ts",
    line: 12,
    column: 33
  },
  {
    name: "NonCallableValue",
    fileName: "src/allowed.ts",
    line: 14,
    column: 1
  },
  {
    name: "acceptsNonCallableObject",
    fileName: "src/allowed.ts",
    line: 18,
    column: 1
  }
]

const runNoCallbacksFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noCallbacks]))
}

test("no-callbacks reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoCallbacksFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
