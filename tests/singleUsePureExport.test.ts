import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { singleUsePureExport } from "@better-typescript/checks/architectureExplore/singleUsePureExport"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
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
  "single-use-pure-export"
)
const expectedMessage =
  "Single-use Pure Export — a pure helper extracted for testability; locality lives at the caller."
const expectedHint =
  "Move the helper next to its only caller (or inline it) so bugs and changes concentrate in one Module."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "normalize",
    fileName: "src/cases.ts",
    line: 1,
    column: 14,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "normalize",
    fileName: "src/allowed.ts",
    line: 1,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(singleUsePureExport)(project))
    )
  )

  return projectElements.flat()
}

test("single-use-pure-export reports single-caller pure exports", async () => {
  const elements = await runFixture()
  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
