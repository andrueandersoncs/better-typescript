import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferEffectArray } from "@better-typescript/checks/preferEffectArray"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-array")

const expectedHint =
  "Prefer Effect's Array module — define the array as a const and call " +
  "Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), " +
  "or the matching Array.* helper — instead of invoking Array.prototype methods " +
  "directly on array values."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "number[].every",
    fileName: "src/cases.ts",
    line: 5,
    column: 21,
    message: "Avoid Array.prototype.every().",
    hint: expectedHint
  },
  {
    name: "Array<T>.some",
    fileName: "src/cases.ts",
    line: 9,
    column: 14,
    message: "Avoid Array.prototype.some().",
    hint: expectedHint
  },
  {
    name: "ReadonlyArray.map",
    fileName: "src/cases.ts",
    line: 13,
    column: 17,
    message: "Avoid Array.prototype.map().",
    hint: expectedHint
  },
  {
    name: "tuple.join",
    fileName: "src/cases.ts",
    line: 17,
    column: 16,
    message: "Avoid Array.prototype.join().",
    hint: expectedHint
  },
  {
    name: "literal.every(Boolean)",
    fileName: "src/cases.ts",
    line: 21,
    column: 17,
    message: "Avoid Array.prototype.every().",
    hint: expectedHint
  },
  {
    name: "union.find",
    fileName: "src/cases.ts",
    line: 25,
    column: 15,
    message: "Avoid Array.prototype.find().",
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  { name: "Array.every", fileName: "src/allowed.ts", line: 6, column: 21 },
  { name: "Array.map", fileName: "src/allowed.ts", line: 7, column: 17 },
  { name: "Array.some", fileName: "src/allowed.ts", line: 8, column: 21 },
  { name: "string.includes", fileName: "src/allowed.ts", line: 12, column: 16 },
  { name: "string.slice", fileName: "src/allowed.ts", line: 13, column: 17 },
  { name: "object.every", fileName: "src/allowed.ts", line: 20, column: 19 },
  { name: "object.map", fileName: "src/allowed.ts", line: 21, column: 20 },
  { name: "class.map", fileName: "src/allowed.ts", line: 26, column: 1 },
  { name: "Set.has", fileName: "src/allowed.ts", line: 29, column: 1 }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  return Effect.runPromise(runCheckOnProject(preferEffectArray)(project))
}

test("prefer-effect-array reports disallowed and permits allowed fixture items", async () => {
  const elements = await runFixture()

  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
