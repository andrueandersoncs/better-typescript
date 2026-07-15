import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferFunctionComposition } from "@better-typescript/checks/preferFunctionComposition"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-function-composition")
const expectedMessage = "Avoid block bodies that only bind a value and thread it into a call."
const expectedHint =
  "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
  "steps compose as an expression instead of a manually threaded local. Do not nest " +
  "the calls."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "fileCheckLike.body",
    fileName: "src/cases.ts",
    line: 32,
    column: 14,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "combineAllLike.body",
    fileName: "src/cases.ts",
    line: 40,
    column: 14,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "unaryWrap.body",
    fileName: "src/cases.ts",
    line: 46,
    column: 61,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "pipeAfterBinding.body",
    fileName: "src/cases.ts",
    line: 52,
    column: 68,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "alreadyFlow.expression",
    fileName: "src/allowed.ts",
    line: 48,
    column: 21
  },
  {
    name: "alreadyPipe.expression",
    fileName: "src/allowed.ts",
    line: 57,
    column: 3
  },
  {
    name: "implicitReturnCandidate.body",
    fileName: "src/allowed.ts",
    line: 65,
    column: 14
  },
  {
    name: "identityBinding.body",
    fileName: "src/allowed.ts",
    line: 69,
    column: 48
  },
  {
    name: "namedFunctionBinding.body",
    fileName: "src/allowed.ts",
    line: 77,
    column: 29
  },
  {
    name: "objectLiteralEmbed.body",
    fileName: "src/allowed.ts",
    line: 87,
    column: 73
  },
  {
    name: "multiArgCall.body",
    fileName: "src/allowed.ts",
    line: 93,
    column: 65
  },
  {
    name: "controlFlowBody.body",
    fileName: "src/allowed.ts",
    line: 99,
    column: 48
  },
  {
    name: "multiConstBody.body",
    fileName: "src/allowed.ts",
    line: 109,
    column: 47
  }
]

const runPreferFunctionCompositionFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferFunctionComposition)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-function-composition reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferFunctionCompositionFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
