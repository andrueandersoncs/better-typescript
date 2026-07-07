import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noArraySpread } from "../src/rules/noArraySpread.js"
import type { Detection } from "../src/detectors/rule.js"
import { runRuleCheckOnProject } from "../src/detectors/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
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

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "first spread of two combined",
    fileName: "src/cases.ts",
    line: 7,
    column: 19,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "second spread of two combined",
    fileName: "src/cases.ts",
    line: 7,
    column: 28,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "leading spread with trailing element",
    fileName: "src/cases.ts",
    line: 9,
    column: 19,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "leading element with trailing spread",
    fileName: "src/cases.ts",
    line: 11,
    column: 25,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "spread surrounded by elements",
    fileName: "src/cases.ts",
    line: 13,
    column: 27,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "lone spread",
    fileName: "src/cases.ts",
    line: 15,
    column: 23,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "parenthesized inner expression",
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

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runRuleCheckOnProject(noArraySpread)(project))
    )
  )

  return projectElements.flat()
}

test("no-array-spread reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()
  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
