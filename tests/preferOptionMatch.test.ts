import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { preferOptionMatch } from "@better-typescript/checks/preferOptionMatch"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-option-match")

const message = "Avoid using Option.isSome/isNone in a ternary to unwrap an Option."

const hint =
  "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
  "instead of manually checking and accessing .value."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "isSome ternary accessing .value in whenTrue",
    fileName: "src/cases.ts",
    line: 28,
    column: 18,
    message,
    hint
  },
  {
    name: "isSome ternary with .value property access in whenTrue",
    fileName: "src/cases.ts",
    line: 36,
    column: 14,
    message,
    hint
  },
  {
    name: "isNone ternary accessing .value in whenFalse",
    fileName: "src/cases.ts",
    line: 40,
    column: 16,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "isSome returning the Option itself (orElse pattern)",
    fileName: "src/allowed.ts",
    line: 14,
    column: 16
  },
  {
    name: "standalone boolean isSome check",
    fileName: "src/allowed.ts",
    line: 20,
    column: 17
  },
  {
    name: "isSome in if-statement guard",
    fileName: "src/allowed.ts",
    line: 24,
    column: 5
  },
  {
    name: "isNone in if-statement guard",
    fileName: "src/allowed.ts",
    line: 30,
    column: 5
  }
]

const runPreferOptionMatchFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferOptionMatch))(project))
    )
  )

  return projectElements.flat()
}

test("prefer-option-match reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferOptionMatchFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
