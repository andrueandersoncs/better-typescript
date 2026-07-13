import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferDirectYield } from "@better-typescript/checks/preferDirectYield"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-direct-yield")
const expectedMessage = "Avoid binding an Effect only to yield* it."
const expectedHint =
  "Write const result = yield* expression (or yield* expression when the result " +
  "is unused) instead of naming a temporary Effect and yielding that name. Keep " +
  "extracting nested call arguments into their own consts so no-nested-calls " +
  "stays satisfied."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "adjacent.subsystemAdviceEffect",
    fileName: "src/cases.ts",
    line: 20,
    column: 9,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "batched.densityAdviceEffect",
    fileName: "src/cases.ts",
    line: 32,
    column: 9,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "batched.subsystemAdviceEffect",
    fileName: "src/cases.ts",
    line: 33,
    column: 9,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "batched.dominanceAdviceEffect",
    fileName: "src/cases.ts",
    line: 34,
    column: 9,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "runCommand.commandEffect",
    fileName: "src/cases.ts",
    line: 43,
    column: 9,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "multiline.commandEffect",
    fileName: "src/cases.ts",
    line: 52,
    column: 9,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "direct.items",
    fileName: "src/allowed.ts",
    line: 18,
    column: 9
  },
  {
    name: "nestedExtract.densityAfterFallbackSuppression",
    fileName: "src/allowed.ts",
    line: 24,
    column: 9
  },
  {
    name: "multiUse.cached",
    fileName: "src/allowed.ts",
    line: 31,
    column: 9
  },
  {
    name: "outerScope.db",
    fileName: "src/allowed.ts",
    line: 39,
    column: 9
  },
  {
    name: "asArgument.id",
    fileName: "src/allowed.ts",
    line: 45,
    column: 9
  },
  {
    name: "plainGenerator.values",
    fileName: "src/allowed.ts",
    line: 52,
    column: 9
  }
]

const runPreferDirectYieldFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferDirectYield)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-direct-yield reports disallowed and permits allowed fixture items", async () => {
  const detections = await runPreferDirectYieldFixture()

  assertDisallowedFixtureItems(detections, disallowedFixtureItems)
  assertAllowedFixtureItems(detections, allowedFixtureItems)
})
