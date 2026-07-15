import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noForLoops } from "@better-typescript/checks/noForLoops"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-for-loops")
const expectedMessage = "Avoid imperative logic in iterator-based for loops."
const expectedHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "doubleValues.iteratorLoop",
    fileName: "src/cases.ts",
    line: 6,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "sumValues.iteratorLoop",
    fileName: "src/cases.ts",
    line: 17,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "loopsWithoutIteratorsAreAllowed.unconditionalLoop",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3
  },
  {
    name: "loopsWithoutIteratorsAreAllowed.conditionOnlyLoop",
    fileName: "src/allowed.ts",
    line: 10,
    column: 3
  }
]

const runNoForLoopsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) => Effect.runPromise(runCheckOnProject(noForLoops)(project)))
  )

  return projectElements.flat()
}

test("no-for-loops reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoForLoopsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
