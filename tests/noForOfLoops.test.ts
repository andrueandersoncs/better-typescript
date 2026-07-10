import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noForOfLoops } from "../src/checks/noForOfLoops.js"
import type { Detection } from "../src/engine/check.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-for-of-loops")
const expectedMessage = "Avoid imperative logic in for..of loops."
const expectedHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "collectValues.forOfLoop",
    fileName: "src/cases.ts",
    line: 6,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "collectAsyncValues.forAwaitOfLoop",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "collectionOperationsAreAllowed",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  }
]

const runNoForOfLoopsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noForOfLoops)(project))
    )
  )

  return projectElements.flat()
}

test("no-for-of-loops reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoForOfLoopsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
