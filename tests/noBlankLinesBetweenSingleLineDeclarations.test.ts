import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noBlankLinesBetweenSingleLineDeclarations } from "@better-typescript/checks/noBlankLinesBetweenSingleLineDeclarations"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
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
  "no-blank-lines-between-single-line-declarations"
)

const message = "Single-line declarations must not have blank lines between them."

const hint =
  "Remove the empty line between these adjacent single-line declarations so they " +
  "stay contiguous. Blank lines remain required around multi-line declarations; " +
  "keep those separators when a neighbor is multi-line."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "spaced single-line neighbors",
    fileName: "src/cases.ts",
    line: 14,
    column: 3,
    message,
    hint
  },
  {
    name: "spaced single-line before multiline cluster",
    fileName: "src/cases.ts",
    line: 22,
    column: 3,
    message,
    hint
  },
  {
    name: "spaced single-line neighbors in nested block",
    fileName: "src/cases.ts",
    line: 37,
    column: 5,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "contiguous single-line neighbors",
    fileName: "src/allowed.ts",
    line: 13,
    column: 3
  },
  {
    name: "single-line after blank around multiline",
    fileName: "src/allowed.ts",
    line: 27,
    column: 3
  },
  {
    name: "module-level single-line after gap",
    fileName: "src/allowed.ts",
    line: 34,
    column: 1
  },
  {
    name: "contiguous nested single-line neighbors",
    fileName: "src/allowed.ts",
    line: 39,
    column: 5
  }
]

const runNoBlankLinesBetweenSingleLineDeclarationsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(
        runCheckOnProject(Array.of(noBlankLinesBetweenSingleLineDeclarations.check))(project)
      )
    )
  )

  return projectElements.flat()
}

test("no-blank-lines-between-single-line-declarations reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoBlankLinesBetweenSingleLineDeclarationsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
