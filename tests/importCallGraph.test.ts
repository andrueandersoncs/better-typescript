import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { importCallGraph } from "@better-typescript/checks/architectureExplore/importCallGraph"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "import-call-graph")
const expectedMessage =
  "This Module participates in an Import Call Graph worth measuring for Architecture Explore Advice."
const expectedHint =
  "Use this silent evidence with shallowness and bounce Advice — do not treat the edge count as a local style nit."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "run",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "identity",
    fileName: "src/allowed.ts",
    line: 1,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(importCallGraph)(project))
    )
  )

  return projectElements.flat()
}

test("import-call-graph reports Modules with measurable import edges", async () => {
  const elements = await runFixture()
  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
