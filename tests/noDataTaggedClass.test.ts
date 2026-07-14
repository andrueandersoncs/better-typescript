import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noDataTaggedClass } from "@better-typescript/checks/noDataTaggedClass"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-data-tagged-class")
const presetFixturePath = path.join(
  testDirectory,
  "fixtures",
  "default-allows-data-tagged-class"
)

const message = "Avoid Data.TaggedClass — use Schema.TaggedClass instead."

const hint =
  "Schema.TaggedClass provides the same tagged-class features as Data.TaggedClass " +
  "plus Schema validation, encoding, decoding, and Schema.is() type guards."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "Data.TaggedClass with simple tag",
    fileName: "src/cases.ts",
    line: 4,
    column: 14,
    message,
    hint
  },
  {
    name: "Data.TaggedClass with multiple fields",
    fileName: "src/cases.ts",
    line: 9,
    column: 14,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Schema.TaggedClass is allowed",
    fileName: "src/allowed.ts",
    line: 4,
    column: 14
  },
  {
    name: "Schema.TaggedError is allowed",
    fileName: "src/allowed.ts",
    line: 9,
    column: 14
  },
  {
    name: "Schema.Class is allowed",
    fileName: "src/allowed.ts",
    line: 15,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noDataTaggedClass)(project))
    )
  )

  return projectElements.flat()
}
const runDefaultFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(presetFixturePath))

  const projectElements = await Promise.all(
    workspace.projects.flatMap((project) =>
      defaultWiring.checks.map((named) =>
        Effect.runPromise(runCheckOnProject(named.check)(project))
      )
    )
  )

  return projectElements.flat()
}

test("no-data-tagged-class reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})

test("default preset allows Data.TaggedClass for non-serializable data", async () => {
  const signals = await runDefaultFixture()

  assert.deepEqual(signals, [])
})
