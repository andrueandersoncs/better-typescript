import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMultipleBooleanOperators } from "../src/checks/noMultipleBooleanOperators.js"
import type { Detection } from "../src/engine/location.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
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

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "two ands",
    fileName: "src/cases.ts",
    line: 13,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "mixed and or",
    fileName: "src/cases.ts",
    line: 16,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "strict equal combined with and",
    fileName: "src/cases.ts",
    line: 19,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "double negation",
    fileName: "src/cases.ts",
    line: 22,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nested ternary",
    fileName: "src/cases.ts",
    line: 25,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "two ands inside ternary condition",
    fileName: "src/ternaryConditions.ts",
    line: 19,
    column: 12,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nested ternary in branch",
    fileName: "src/ternaryConditions.ts",
    line: 22,
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
  },
  {
    name: "ternary with one comparison in condition",
    fileName: "src/ternaryConditions.ts",
    line: 13,
    column: 12
  },
  {
    name: "ternary with single-operator condition",
    fileName: "src/ternaryConditions.ts",
    line: 16,
    column: 12
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noMultipleBooleanOperators)(project))
    )
  )

  return projectElements.flat()
}

test("no-multiple-boolean-operators reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()
  assertDisallowedFixtureItems(signals, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
