import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferEffectRecordFilterMap } from "@better-typescript/checks/preferEffectRecordFilterMap"
import type { Detection } from "@better-typescript/core/engine/location"
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
  "prefer-effect-record-filter-map"
)
const expectedMessage = "Avoid conditional object spreads."
const expectedHint =
  "Build a record of candidate properties and use Record.filterMap from Effect " +
  "with Option.some/Option.none (or Option.fromNullable) to keep only present entries."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "truthy value adds field",
    fileName: "src/cases.ts",
    line: 12,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "empty object in true branch",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "parenthesized conditional",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "multi-property branch",
    fileName: "src/cases.ts",
    line: 32,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "unconditional spread",
    fileName: "src/allowed.ts",
    line: 11,
    column: 5
  },
  {
    name: "conditional object expression outside spread",
    fileName: "src/allowed.ts",
    line: 15,
    column: 20
  },
  {
    name: "conditional chooses between populated objects",
    fileName: "src/allowed.ts",
    line: 20,
    column: 5
  },
  {
    name: "conditional chooses object variable",
    fileName: "src/allowed.ts",
    line: 26,
    column: 5
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferEffectRecordFilterMap)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-effect-record-filter-map reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()
  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
