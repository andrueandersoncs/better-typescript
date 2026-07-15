import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Array, Effect } from "effect"
import { preferSchemaTaggedClass } from "@better-typescript/checks/preferSchemaTaggedClass"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-schema-tagged-class")
const processBoundFixturePath = path.join(
  testDirectory,
  "fixtures",
  "default-allows-data-tagged-class"
)

const message = "Prefer Schema.TaggedClass when every field has a portable wire representation."

const hint =
  "This Data.TaggedClass contains only wire-safe structural fields. Define those fields " +
  "with Schema and extend Schema.TaggedClass so construction, validation, encoding, and " +
  "decoding share one contract. Reserve Data.TaggedClass for process-bound values such as " +
  "streams, effects, functions, compiler objects, and live handles."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "primitive portable fields",
    fileName: "src/cases.ts",
    line: 3,
    column: 14,
    message,
    hint
  },
  {
    name: "nested portable fields",
    fileName: "src/cases.ts",
    line: 17,
    column: 14,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "stream field",
    fileName: "src/allowed.ts",
    line: 3,
    column: 14
  },
  {
    name: "function field",
    fileName: "src/allowed.ts",
    line: 7,
    column: 14
  },
  {
    name: "unresolved field",
    fileName: "src/allowed.ts",
    line: 11,
    column: 14
  },
  {
    name: "Schema.TaggedClass",
    fileName: "src/allowed.ts",
    line: 15,
    column: 14
  },
  {
    name: "unrelated local TaggedClass",
    fileName: "src/allowed.ts",
    line: 27,
    column: 14
  }
]

const runCheckFixture = async (rootPath: string): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(rootPath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferSchemaTaggedClass))(project))
    )
  )

  return projectElements.flat()
}

const runDefaultFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(processBoundFixturePath))

  const projectElements = await Promise.all(
    workspace.projects.flatMap((project) =>
      defaultWiring.checks.map((named) =>
        Effect.runPromise(runCheckOnProject(Array.of(named.check))(project))
      )
    )
  )

  return projectElements.flat()
}

test("prefer-schema-tagged-class reports portable Data models and permits process-bound models", async () => {
  const detections = await runCheckFixture(fixturePath)

  assertDisallowedFixtureItems(detections, disallowedFixtureItems)
  assertAllowedFixtureItems(detections, allowedFixtureItems)
})

test("default preset activates the portable tagged-class policy and allows process-bound data", async () => {
  const isActive = Array.some(
    defaultWiring.checks,
    (check) => check.name === "prefer-schema-tagged-class"
  )
  const detections = await runDefaultFixture()

  assert.equal(isActive, true)
  assert.deepEqual(detections, [])
})
