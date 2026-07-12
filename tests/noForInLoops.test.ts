import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noForInLoops } from "@better-typescript/checks/noForInLoops"
import { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-for-in-loops")
const expectedMessage = "Avoid imperative logic in for..in loops."
const expectedHint =
  "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
  "or Record.toEntries(), instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "sumRecord.forInLoop",
    fileName: "src/cases.ts",
    line: 6,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "copyRecord.forInLoop",
    fileName: "src/cases.ts",
    line: 16,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "recordOperationsAreAllowed",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  }
]

const runNoForInLoopsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noForInLoops)(project))
    )
  )

  return projectElements.flat()
}

test("no-for-in-loops reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoForInLoopsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
