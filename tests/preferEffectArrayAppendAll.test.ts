import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferEffectArrayAppendAll } from "@better-typescript/checks/preferEffectArrayAppendAll"
import { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-array-append-all")
const expectedMessage = "Avoid conditional array spreads."
const expectedHint =
  "Use Array.appendAll from Effect to combine arrays instead of spreading a " +
  "conditional expression that chooses between an array and an empty array literal."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "empty array in false branch",
    fileName: "src/cases.ts",
    line: 7,
    column: 29,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "empty array in true branch",
    fileName: "src/cases.ts",
    line: 9,
    column: 28,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "parenthesized conditional",
    fileName: "src/cases.ts",
    line: 11,
    column: 35,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "non-literal true branch with empty false branch",
    fileName: "src/cases.ts",
    line: 13,
    column: 31,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "unconditional spread",
    fileName: "src/allowed.ts",
    line: 7,
    column: 30
  },
  {
    name: "conditional outside spread",
    fileName: "src/allowed.ts",
    line: 9,
    column: 34
  },
  {
    name: "both branches populated",
    fileName: "src/allowed.ts",
    line: 11,
    column: 32
  },
  {
    name: "both branches empty",
    fileName: "src/allowed.ts",
    line: 13,
    column: 28
  },
  {
    name: "spread in function call",
    fileName: "src/allowed.ts",
    line: 15,
    column: 39
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferEffectArrayAppendAll)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-effect-array-append-all reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()
  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
