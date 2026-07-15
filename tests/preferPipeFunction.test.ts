import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { preferPipeFunction } from "@better-typescript/checks/preferPipeFunction"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-pipe-function")

const message = "Avoid calling .pipe() as a method."

const hint =
  'Import pipe from "effect" and call it as a standalone function: ' +
  "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "method pipe on Effect",
    fileName: "src/cases.ts",
    line: 4,
    column: 35,
    message,
    hint
  },
  {
    name: "method pipe on Option",
    fileName: "src/cases.ts",
    line: 7,
    column: 31,
    message,
    hint
  },
  {
    name: "chained method pipe",
    fileName: "src/cases.ts",
    line: 13,
    column: 46,
    message,
    hint
  },
  {
    name: "method pipe on a variable",
    fileName: "src/cases.ts",
    line: 17,
    column: 21,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "standalone pipe function call",
    fileName: "src/allowed.ts",
    line: 4,
    column: 17
  },
  {
    name: "standalone pipe with Option",
    fileName: "src/allowed.ts",
    line: 10,
    column: 15
  },
  {
    name: "standalone pipe on a variable",
    fileName: "src/allowed.ts",
    line: 18,
    column: 17
  },
  {
    name: "non-pipe method call",
    fileName: "src/allowed.ts",
    line: 22,
    column: 20
  },
  {
    name: "property access named pipe that is not a call",
    fileName: "src/allowed.ts",
    line: 26,
    column: 18
  },
  {
    name: "first-party interface pipe method",
    fileName: "src/firstPartyPipe.ts",
    line: 8,
    column: 30
  }
]

const runPreferPipeFunctionFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferPipeFunction))(project))
    )
  )

  return projectElements.flat()
}

test("prefer-pipe-function reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferPipeFunctionFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
