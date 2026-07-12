import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferDedicatedDataStructureFiles } from "@better-typescript/checks/preferDedicatedDataStructureFiles"
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
  "prefer-dedicated-data-structure-files"
)

const message =
  "Avoid defining data structures in the same file as functions/algorithms."

const hint =
  "Move data structures (Schema.Class, Data.Class, interfaces, object type aliases) into their " +
  "own dedicated file. When they share a concept with algorithms, create a directory named for " +
  "that concept and keep the data-structure file and algorithm file side by side."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "Schema.Class colocated with algorithm",
    fileName: "src/cases.ts",
    line: 3,
    column: 14,
    message,
    hint
  },
  {
    name: "interface colocated with algorithm",
    fileName: "src/cases.ts",
    line: 11,
    column: 18,
    message,
    hint
  },
  {
    name: "object type alias colocated with algorithm",
    fileName: "src/cases.ts",
    line: 24,
    column: 13,
    message,
    hint
  },
  {
    name: "Data.Class colocated with algorithm",
    fileName: "src/cases.ts",
    line: 34,
    column: 14,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Schema.Class alone is allowed",
    fileName: "src/allowed.ts",
    line: 3,
    column: 14
  },
  {
    name: "interface alone is allowed",
    fileName: "src/allowed.ts",
    line: 7,
    column: 18
  },
  {
    name: "object type alias alone is allowed",
    fileName: "src/allowed.ts",
    line: 12,
    column: 13
  },
  {
    name: "algorithm-only file is allowed",
    fileName: "src/allowedAlgorithms.ts",
    line: 1,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(
        runCheckOnProject(preferDedicatedDataStructureFiles)(project)
      )
    )
  )

  return projectElements.flat()
}

test("prefer-dedicated-data-structure-files reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
