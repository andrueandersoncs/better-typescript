import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Array, Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { requireWireSafeSchemaTaggedClass } from "@better-typescript/checks/requireWireSafeSchemaTaggedClass"
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
const fixturePath = path.join(testDirectory, "fixtures", "require-wire-safe-schema-tagged-class")

const message = "Require Schema.TaggedClass to have a portable encoded representation."

const hint =
  "At least one encoded field is not provably composed of strings, numbers, booleans, " +
  "null, arrays, tuples, or string/number-keyed structural records. Give it a transformation " +
  "with a portable encoded side, or use Data.TaggedClass when the value intentionally carries " +
  "process-bound state. Any, unknown, identity/self schemas, functions, symbols, bigint, " +
  "undefined, and opaque class instances do not establish a portable contract."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "Schema.Any field",
    fileName: "src/cases.ts",
    line: 5,
    column: 14,
    message,
    hint
  },
  {
    name: "Schema.Unknown field",
    fileName: "src/cases.ts",
    line: 10,
    column: 14,
    message,
    hint
  },
  {
    name: "Date identity encoding",
    fileName: "src/cases.ts",
    line: 15,
    column: 14,
    message,
    hint
  },
  {
    name: "symbol identity encoding",
    fileName: "src/cases.ts",
    line: 20,
    column: 14,
    message,
    hint
  },
  {
    name: "bigint identity encoding",
    fileName: "src/cases.ts",
    line: 25,
    column: 14,
    message,
    hint
  },
  {
    name: "undefined encoding",
    fileName: "src/cases.ts",
    line: 30,
    column: 14,
    message,
    hint
  },
  {
    name: "opaque instance encoding",
    fileName: "src/cases.ts",
    line: 35,
    column: 14,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "portable nested encoded structure",
    fileName: "src/allowed.ts",
    line: 3,
    column: 14
  },
  {
    name: "Data.TaggedClass is outside this check",
    fileName: "src/allowed.ts",
    line: 16,
    column: 14
  },
  {
    name: "unrelated local TaggedClass",
    fileName: "src/allowed.ts",
    line: 28,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(requireWireSafeSchemaTaggedClass)(project))
    )
  )

  return projectElements.flat()
}

test("require-wire-safe-schema-tagged-class rejects opaque encodings and permits portable encodings", async () => {
  const detections = await runFixture()

  assertDisallowedFixtureItems(detections, disallowedFixtureItems)
  assertAllowedFixtureItems(detections, allowedFixtureItems)
})

test("default preset activates the wire-safe Schema tagged-class policy", () => {
  const isActive = Array.some(
    defaultWiring.checks,
    (check) => check.name === "require-wire-safe-schema-tagged-class"
  )

  assert.equal(isActive, true)
})
