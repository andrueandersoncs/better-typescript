import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { wideThinExports } from "@better-typescript/checks/architectureExplore/wideThinExports"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "wide-thin-exports")
const expectedMessage =
  "This Module has a Wide Thin Export Surface — many exports over little implementation."
const expectedHint =
  "Deepen one Module behind a smaller interface, or split concepts so each file earns its exports."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "flags",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "describeOrder",
    fileName: "src/allowed.ts",
    line: 1,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(wideThinExports)(project))
    )
  )

  return projectElements.flat()
}

test("wide-thin-exports reports wide thin Modules", async () => {
  const elements = await runFixture()
  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
