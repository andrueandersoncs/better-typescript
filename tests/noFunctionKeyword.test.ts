import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noFunctionKeyword } from "../src/rules/noFunctionKeyword.js"
import type { Detection } from "../src/detectors/rule.js"
import { runRuleCheckOnProject } from "../src/detectors/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-function-keyword")
const expectedMessage = "Avoid using the function keyword."
const expectedHint =
  "Declare this function as a const using fat-arrow syntax instead. Keep function " +
  "declarations only when overload signatures are required, and keep function* when " +
  "generator semantics are required."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "plainDeclaration",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "expression",
    fileName: "src/cases.ts",
    line: 7,
    column: 20,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "namedExpression",
    fileName: "src/cases.ts",
    line: 11,
    column: 25,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nestedExpression.value",
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
    fileName: "src/allowed.ts",
    line: 3,
    column: 26
  },
  {
    name: "overload.stringSignature",
    fileName: "src/allowed.ts",
    line: 5,
    column: 1
  },
  {
    name: "overload.numberSignature",
    fileName: "src/allowed.ts",
    line: 6,
    column: 1
  },
  {
    name: "overload.implementation",
    fileName: "src/allowed.ts",
    line: 7,
    column: 1
  },
  {
    name: "generatorDeclaration",
    fileName: "src/allowed.ts",
    line: 11,
    column: 1
  },
  {
    name: "generatorExpression",
    fileName: "src/allowed.ts",
    line: 15,
    column: 29
  },
  {
    name: "arrowFunction",
    fileName: "src/allowed.ts",
    line: 19,
    column: 23
  },
  {
    name: "Service.methodDeclaration",
    fileName: "src/allowed.ts",
    line: 22,
    column: 3
  }
]

const runNoFunctionKeywordFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runRuleCheckOnProject(noFunctionKeyword)(project))
    )
  )

  return projectElements.flat()
}

test("no-function-keyword reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoFunctionKeywordFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
