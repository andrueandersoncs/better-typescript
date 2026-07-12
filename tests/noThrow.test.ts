import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noThrow } from "@better-typescript/checks/noThrow"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-throw")
const expectedMessage = "Avoid throwing errors with throw."
const expectedHint =
  "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
  'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "topLevelThrow",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "throwInIfBlock",
    fileName: "src/cases.ts",
    line: 9,
    column: 5,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "throwInCatch",
    fileName: "src/cases.ts",
    line: 19,
    column: 5,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "throwInArrowBody",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "returnsError.function",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  },
  {
    name: "rethrow.identifier",
    fileName: "src/allowed.ts",
    line: 7,
    column: 7
  },
  {
    name: "throwLabel.property",
    fileName: "src/allowed.ts",
    line: 9,
    column: 13
  },
  {
    name: "message.string",
    fileName: "src/allowed.ts",
    line: 11,
    column: 7
  }
]

const runNoThrowFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noThrow)(project))
    )
  )

  return projectElements.flat()
}

test("no-throw reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoThrowFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
