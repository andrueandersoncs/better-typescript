import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { requireBlankLinesAroundMultilineDeclarations } from "@better-typescript/checks/requireBlankLinesAroundMultilineDeclarations"
import type { Detection } from "@better-typescript/core/engine/location/data"
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
  "require-blank-lines-around-multiline-declarations"
)

const message = "Multi-line declarations must have a blank line above and below."

const hint =
  "Insert an empty line before and after this declaration so its multi-line shape " +
  "is visually separated from neighboring statements. Single-line declarations do " +
  "not need surrounding blank lines; the first and last statements in a block are " +
  "exempt on the outer sides."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "crowded multi-line const reduce",
    fileName: "src/cases.ts",
    line: 13,
    column: 3,
    message,
    hint
  },
  {
    name: "crowded multi-line type alias",
    fileName: "src/cases.ts",
    line: 23,
    column: 1,
    message,
    hint
  },
  {
    name: "crowded multi-line interface",
    fileName: "src/cases.ts",
    line: 29,
    column: 1,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "spaced multi-line const reduce",
    fileName: "src/allowed.ts",
    line: 14,
    column: 3
  },
  {
    name: "single-line neighbors",
    fileName: "src/allowed.ts",
    line: 26,
    column: 3
  },
  {
    name: "spaced multi-line type alias",
    fileName: "src/allowed.ts",
    line: 32,
    column: 1
  },
  {
    name: "spaced multi-line interface",
    fileName: "src/allowed.ts",
    line: 39,
    column: 1
  },
  {
    name: "sole multi-line declaration in block",
    fileName: "src/allowed.ts",
    line: 46,
    column: 3
  }
]

const runRequireBlankLinesAroundMultilineDeclarationsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(requireBlankLinesAroundMultilineDeclarations)(project))
    )
  )

  return projectElements.flat()
}

test("require-blank-lines-around-multiline-declarations reports disallowed and permits allowed fixture items", async () => {
  const signals = await runRequireBlankLinesAroundMultilineDeclarationsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
