import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noInstanceof } from "@better-typescript/checks/noInstanceof"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-instanceof")

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "instanceof with first-party class AppError",
    fileName: "src/cases.ts",
    line: 6,
    column: 27,
    message: 'Avoid instanceof for the first-party class "AppError".',
    hint:
      "Use Schema.is(AppError)(value) or a Schema-based type guard instead of instanceof. " +
      "Schema.is is structural, works across realms, and stays consistent with " +
      "the Effect type system."
  },
  {
    name: "instanceof with first-party class Config",
    fileName: "src/cases.ts",
    line: 13,
    column: 25,
    message: 'Avoid instanceof for the first-party class "Config".',
    hint:
      "Use Schema.is(Config)(value) or a Schema-based type guard instead of instanceof. " +
      "Schema.is is structural, works across realms, and stays consistent with " +
      "the Effect type system."
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "instanceof with built-in Error (third-party)",
    fileName: "src/allowed.ts",
    line: 6,
    column: 24
  },
  {
    name: "instanceof with built-in Date (third-party)",
    fileName: "src/allowed.ts",
    line: 9,
    column: 23
  },
  {
    name: "Schema.is type guard (no instanceof)",
    fileName: "src/allowed.ts",
    line: 17,
    column: 27
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noInstanceof)(project))
    )
  )

  return projectElements.flat()
}

test("no-instanceof reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
