import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferFunctionFlip } from "@better-typescript/checks/preferFunctionFlip"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-function-flip")
const expectedMessage =
  "Avoid lambdas that only flip the order of a curried application."
const expectedHint =
  "Reorder the curried parameters so the fixed argument comes first " +
  "(data-last), then pass the partial f(y) directly — or use " +
  "Function.flip(f)(y) instead of (x) => f(x)(y)."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "flippedInline",
    fileName: "src/cases.ts",
    line: 26,
    column: 30,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "flippedHandler",
    fileName: "src/cases.ts",
    line: 32,
    column: 11,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "flippedPartialCallee",
    fileName: "src/cases.ts",
    line: 35,
    column: 37,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "alreadyDataLast",
    fileName: "src/allowed.ts",
    line: 23,
    column: 14
  },
  { name: "usesFlip", fileName: "src/allowed.ts", line: 25, column: 14 },
  {
    name: "usesParameterInOuter",
    fileName: "src/allowed.ts",
    line: 27,
    column: 14
  },
  { name: "bracedFlip", fileName: "src/allowed.ts", line: 31, column: 14 },
  { name: "multiArg", fileName: "src/allowed.ts", line: 37, column: 22 },
  {
    name: "methodReceiver",
    fileName: "src/allowed.ts",
    line: 39,
    column: 29
  }
]

const runPreferFunctionFlipFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferFunctionFlip)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-function-flip reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferFunctionFlipFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
