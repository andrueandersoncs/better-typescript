import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferCurriedDataLastFunctions } from "../src/checks/preferCurriedDataLastFunctions.js"
import type { Detection } from "../src/engine/location.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "prefer-curried-data-last-functions"
)

const disallowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "combineValues two-parameter arrow",
    fileName: "src/cases.ts",
    line: 1,
    column: 30
  },
  {
    name: "collectValues rest-parameter arrow",
    fileName: "src/cases.ts",
    line: 4,
    column: 30
  },
  {
    name: "multiplyValues two-parameter function expression",
    fileName: "src/cases.ts",
    line: 6,
    column: 31
  },
  {
    name: "clampRange multi-parameter outer arrow returning another arrow",
    fileName: "src/cases.ts",
    line: 11,
    column: 3
  },
  {
    name: "ruleStyleMatches first-party handler reference",
    fileName: "src/cases.ts",
    line: 23,
    column: 26
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "appendSuffix curried data-last arrow",
    fileName: "src/allowed.ts",
    line: 3,
    column: 29
  },
  {
    name: "doubleValue single-parameter arrow",
    fileName: "src/allowed.ts",
    line: 6,
    column: 28
  },
  {
    name: "readDefault zero-parameter thunk",
    fileName: "src/allowed.ts",
    line: 8,
    column: 28
  },
  {
    name: "sumInlineReduce callback shape dictated by Array.prototype.reduce",
    fileName: "src/allowed.ts",
    line: 11,
    column: 17
  },
  {
    name: "typedReducer two-parameter typed callback variable",
    fileName: "src/allowed.ts",
    line: 13,
    column: 38
  },
  {
    name: "namedReducer two-parameter callback passed to reduce by reference",
    fileName: "src/allowed.ts",
    line: 15,
    column: 22
  }
]

const ruleElementLocation = (element: Detection) => ({
  fileName: element.location.path,
  line: element.location.line,
  column: element.location.column
})

const fixtureItemLocation = (item: FixtureItem) => ({
  fileName: item.fileName,
  line: item.line,
  column: item.column
})

const runPreferCurriedDataLastFunctionsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(
        runCheckOnProject(preferCurriedDataLastFunctions)(project)
      )
    )
  )

  return projectElements.flat()
}

test("prefer-curried-data-last-functions reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferCurriedDataLastFunctionsFixture()

  assert.deepEqual(
    signals.map(ruleElementLocation),
    disallowedFixtureItems.map(fixtureItemLocation),
    "expected the helper to report exactly the disallowed fixture locations"
  )
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
