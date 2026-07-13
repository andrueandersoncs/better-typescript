import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { seamLeakageEvidence } from "@better-typescript/checks/architectureExplore/seamLeakageEvidence"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "seam-leakage-evidence")
const expectedMessage =
  "This import is Seam Leakage Evidence — it reaches past a public entry into another Module's internals."
const expectedHint =
  "Import through the neighbouring Module's public interface, or deepen a shared Module at the seam."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "secret",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "charge",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(seamLeakageEvidence)(project))
    )
  )

  return projectElements.flat()
}

test("seam-leakage-evidence reports deep internal imports", async () => {
  const elements = await runFixture()
  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
