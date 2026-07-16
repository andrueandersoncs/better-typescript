import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noErrorType } from "@better-typescript/checks/noErrorType"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-error-type")

const message = "Avoid the built-in Error type."

const hint =
  "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
  "type parameter, or use unknown at an untyped boundary."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "Stream error channel",
    fileName: "src/cases.ts",
    line: 4,
    column: 29,
    message,
    hint
  },
  {
    name: "Effect error channel",
    fileName: "src/cases.ts",
    line: 5,
    column: 38,
    message,
    hint
  },
  {
    name: "parameter type",
    fileName: "src/cases.ts",
    line: 7,
    column: 34,
    message,
    hint
  },
  {
    name: "union member",
    fileName: "src/cases.ts",
    line: 9,
    column: 23,
    message,
    hint
  },
  {
    name: "qualified built-in Error type",
    fileName: "src/cases.ts",
    line: 11,
    column: 43,
    message,
    hint
  },
  {
    name: "callback parameter type",
    fileName: "src/cases.ts",
    line: 14,
    column: 26,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "preserved generic error channel",
    fileName: "src/allowed.ts",
    line: 8,
    column: 29
  },
  {
    name: "specific tagged error",
    fileName: "src/allowed.ts",
    line: 12,
    column: 7
  },
  {
    name: "first-party Error-named type",
    fileName: "src/allowed.ts",
    line: 17,
    column: 28
  },
  {
    name: "built-in Error value",
    fileName: "src/allowed.ts",
    line: 19,
    column: 34
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(noErrorType))(project))
    )
  )

  return projectElements.flat()
}

test("no-error-type reports built-in Error types and permits allowed fixture items", async () => {
  const detections = await runFixture()

  assertDisallowedFixtureItems(detections, disallowedFixtureItems)
  assertAllowedFixtureItems(detections, allowedFixtureItems)
})
