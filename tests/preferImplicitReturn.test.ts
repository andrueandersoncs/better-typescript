import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { preferImplicitReturn } from "@better-typescript/checks/preferImplicitReturn"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-implicit-return")
const expectedMessage = "Avoid arrow function block bodies that only return a value."
const expectedHint =
  "Replace this with an implicit return by removing the return statement and function " +
  "body braces. Wrap object literals in parentheses when needed."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "double.body",
    fileName: "src/cases.ts",
    line: 3,
    column: 39,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "greet.body",
    fileName: "src/cases.ts",
    line: 7,
    column: 41,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "makeUser.body",
    fileName: "src/cases.ts",
    line: 11,
    column: 59,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "toText.body",
    fileName: "src/cases.ts",
    line: 15,
    column: 43,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "sign.body",
    fileName: "src/cases.ts",
    line: 19,
    column: 37,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "alreadyImplicit.body",
    fileName: "src/allowed.ts",
    line: 3,
    column: 48
  },
  {
    name: "multiStatement.body",
    fileName: "src/allowed.ts",
    line: 5,
    column: 47
  },
  {
    name: "nonReturnStatement.body",
    fileName: "src/allowed.ts",
    line: 10,
    column: 68
  },
  {
    name: "bareReturn.body",
    fileName: "src/allowed.ts",
    line: 14,
    column: 32
  },
  {
    name: "functionDeclaration.body",
    fileName: "src/allowed.ts",
    line: 18,
    column: 41
  },
  {
    name: "emptyBlock.body",
    fileName: "src/allowed.ts",
    line: 22,
    column: 32
  }
]

const runPreferImplicitReturnFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferImplicitReturn))(project))
    )
  )

  return projectElements.flat()
}

test("prefer-implicit-return reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferImplicitReturnFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
