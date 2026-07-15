import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noPrimitiveArrayConstructors } from "@better-typescript/checks/noPrimitiveArrayConstructors"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-primitive-array-constructors")
const expectedMessage = "Avoid primitive Array constructors."
const expectedHint =
  "Use Effect's Array module instead — Array.empty() for an empty array, " +
  "Array.of(value) or Array.make(...) for elements, Array.allocate(n) for a " +
  "fixed length, and Array.fromIterable for an iterable."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "new Array empty",
    fileName: "src/cases.ts",
    line: 3,
    column: 15,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "new Array sized",
    fileName: "src/cases.ts",
    line: 5,
    column: 15,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "new Array elements",
    fileName: "src/cases.ts",
    line: 7,
    column: 18,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Array call elements",
    fileName: "src/cases.ts",
    line: 9,
    column: 16,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Array call sized",
    fileName: "src/cases.ts",
    line: 11,
    column: 21,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "new Array inline return",
    fileName: "src/cases.ts",
    line: 13,
    column: 44,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "literal empty",
    fileName: "src/cases.ts",
    line: 15,
    column: 45,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "literal one",
    fileName: "src/cases.ts",
    line: 17,
    column: 43,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "literal many",
    fileName: "src/cases.ts",
    line: 19,
    column: 44,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "literal return",
    fileName: "src/cases.ts",
    line: 21,
    column: 53,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Effect Array.make",
    fileName: "src/allowed.ts",
    line: 5,
    column: 14
  },
  {
    name: "Effect Array.of",
    fileName: "src/allowed.ts",
    line: 7,
    column: 15
  },
  {
    name: "Effect Array.empty",
    fileName: "src/allowed.ts",
    line: 9,
    column: 17
  },
  {
    name: "Effect Array.allocate",
    fileName: "src/allowed.ts",
    line: 11,
    column: 19
  },
  {
    name: "Effect Array.fromIterable",
    fileName: "src/allowed.ts",
    line: 13,
    column: 18
  },
  {
    name: "Array.isArray",
    fileName: "src/allowed.ts",
    line: 15,
    column: 15
  },
  {
    name: "Array.from",
    fileName: "src/allowed.ts",
    line: 17,
    column: 20
  },
  {
    name: "typed array",
    fileName: "src/allowed.ts",
    line: 19,
    column: 15
  },
  {
    name: "namespaced Array",
    fileName: "src/allowed.ts",
    line: 27,
    column: 21
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(noPrimitiveArrayConstructors))(project))
    )
  )

  return projectElements.flat()
}

test("no-primitive-array-constructors reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()
  assertDisallowedFixtureItems(signals, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
