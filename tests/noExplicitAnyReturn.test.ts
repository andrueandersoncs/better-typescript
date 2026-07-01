import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noExplicitAnyReturn } from "../src/rules/noExplicitAnyReturn.js"
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
  "no-explicit-any-return"
)
const expectedMessage = "Avoid function return types that include any."
const expectedHint =
  "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
  "use unknown and narrow before use."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "functionDeclaration",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "functionExpression",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 7,
    column: 28,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "arrowFunction",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 11,
    column: 23,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Service.methodDeclaration",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 14,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Service.value.get",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "ServiceContract.methodSignature",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 24,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "CallableContract.callSignature",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 28,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "FunctionTypeAlias",
    ruleId: "no-explicit-any-return",
    fileName: "src/cases.ts",
    line: 31,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Service.value.set",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3
  },
  {
    name: "Service.preciseMethod",
    fileName: "src/allowed.ts",
    line: 8,
    column: 3
  },
  {
    name: "preciseReturn",
    fileName: "src/allowed.ts",
    line: 13,
    column: 1
  },
  {
    name: "inferredReturn",
    fileName: "src/allowed.ts",
    line: 17,
    column: 1
  },
  {
    name: "parameterOnly",
    fileName: "src/allowed.ts",
    line: 21,
    column: 1
  },
  {
    name: "AnyAlias",
    fileName: "src/allowed.ts",
    line: 25,
    column: 6
  },
  {
    name: "aliasReturn",
    fileName: "src/allowed.ts",
    line: 27,
    column: 1
  }
]

const runNoExplicitAnyReturnFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noExplicitAnyReturn])(project)
  )
}

test("no-explicit-any-return reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoExplicitAnyReturnFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
