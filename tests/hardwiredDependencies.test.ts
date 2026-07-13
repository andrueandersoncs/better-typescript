import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { hardwiredDependencies } from "@better-typescript/checks/architectureExplore/hardwiredDependencies"
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
  "hardwired-dependencies"
)
const expectedMessage =
  "Hardwired Dependency — constructing a collaborator inside this Module blocks an injectable seam."
const expectedHint =
  "Accept the collaborator at the interface (adapter at the seam) so tests can substitute a second adapter."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "loader",
    fileName: "src/cases.ts",
    line: 2,
    column: 18,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "loadConfig",
    fileName: "src/allowed.ts",
    line: 9,
    column: 14
  },
  {
    name: "localConfig",
    fileName: "src/allowed.ts",
    line: 16,
    column: 3
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(hardwiredDependencies)(project))
    )
  )

  return projectElements.flat()
}

test("hardwired-dependencies reports constructors inside functions", async () => {
  const elements = await runFixture()
  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
