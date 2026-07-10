import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noNewError } from "../src/checks/noNewError.js"
import type { Detection } from "../src/engine/check.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-new-error")
const expectedMessage = "Avoid using new Error() directly."
const expectedHint =
  "Declare a custom error with Effect Schema.TaggedError, then use new CustomError() " +
  "instead of bare new Error()."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "withMessage",
    fileName: "src/cases.ts",
    line: 3,
    column: 21,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "noArgs",
    fileName: "src/cases.ts",
    line: 5,
    column: 16,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "returnsErrorInline",
    fileName: "src/cases.ts",
    line: 8,
    column: 10,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "newTypeError",
    fileName: "src/allowed.ts",
    line: 3,
    column: 7
  },
  {
    name: "newRangeError",
    fileName: "src/allowed.ts",
    line: 5,
    column: 7
  },
  {
    name: "appErrorClass",
    fileName: "src/allowed.ts",
    line: 7,
    column: 1
  },
  {
    name: "newAppError",
    fileName: "src/allowed.ts",
    line: 8,
    column: 7
  },
  {
    name: "newNsError",
    fileName: "src/allowed.ts",
    line: 13,
    column: 7
  },
  {
    name: "calledWithoutNew",
    fileName: "src/allowed.ts",
    line: 15,
    column: 7
  }
]

const runNoNewErrorFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noNewError)(project))
    )
  )

  return projectElements.flat()
}

test("no-new-error reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoNewErrorFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
