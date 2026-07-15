import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noExplicitAnyReturn } from "@better-typescript/checks/noExplicitAnyReturn"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-explicit-any-return")
const expectedMessage = "Avoid function return types that include any."
const expectedHint =
  "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
  "use unknown and narrow before use."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "functionDeclaration",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "functionExpression",
    fileName: "src/cases.ts",
    line: 7,
    column: 28,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "arrowFunction",
    fileName: "src/cases.ts",
    line: 11,
    column: 23,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Service.methodDeclaration",
    fileName: "src/cases.ts",
    line: 14,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Service.value.get",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "ServiceContract.methodSignature",
    fileName: "src/cases.ts",
    line: 24,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "CallableContract.callSignature",
    fileName: "src/cases.ts",
    line: 28,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "FunctionTypeAlias",
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

const runNoExplicitAnyReturnFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noExplicitAnyReturn)(project))
    )
  )

  return projectElements.flat()
}

test("no-explicit-any-return reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoExplicitAnyReturnFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
