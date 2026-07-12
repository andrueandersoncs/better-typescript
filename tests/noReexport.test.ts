import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noReexport } from "@better-typescript/checks/noReexport"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-reexport")
const expectedMessage = "Avoid re-exporting entities defined in other files."
const expectedHint =
  "Define the entity in this file before exporting it, or import it directly " +
  "from the file that defines it. For package entrypoints, point package.json " +
  "exports at the defining modules instead of barrel re-exports."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "exportTypeFrom",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "exportNamedFrom",
    fileName: "src/cases.ts",
    line: 2,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "exportStarFrom",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "exportStarAsFrom",
    fileName: "src/cases.ts",
    line: 4,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "exportImportedBinding",
    fileName: "src/cases.ts",
    line: 9,
    column: 10,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "exportImportedBindingAlias",
    fileName: "src/cases.ts",
    line: 10,
    column: 10,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "exportDefaultImported",
    fileName: "src/cases.ts",
    line: 11,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "localType.export",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "localValue.export",
    fileName: "src/allowed.ts",
    line: 9,
    column: 1
  },
  {
    name: "usesImport.export",
    fileName: "src/allowed.ts",
    line: 11,
    column: 1
  },
  {
    name: "localDefault.export",
    fileName: "src/allowed.ts",
    line: 14,
    column: 1
  }
]

const runNoReexportFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noReexport)(project))
    )
  )

  return projectElements.flat()
}

test("no-reexport reports disallowed and permits allowed fixture items", async () => {
  const elements = await runNoReexportFixture()

  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
