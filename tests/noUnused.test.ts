import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noUnused } from "@better-typescript/checks/noUnused"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-unused")
const expectedMessage = "Avoid unused imports, declarations, and parameters."
const expectedHint =
  "Delete the unused import, variable, function, type, or parameter. " +
  "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "unusedHelper.import",
    fileName: "src/cases.ts",
    line: 1,
    column: 18,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "UnusedType.import",
    fileName: "src/cases.ts",
    line: 2,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "unusedValue.const",
    fileName: "src/cases.ts",
    line: 4,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "unusedFunction.const",
    fileName: "src/cases.ts",
    line: 6,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "UnusedAlias.type",
    fileName: "src/cases.ts",
    line: 8,
    column: 6,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "unused.parameter",
    fileName: "src/cases.ts",
    line: 10,
    column: 41,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "helper.import",
    fileName: "src/allowed.ts",
    line: 1,
    column: 10
  },
  {
    name: "localValue.const",
    fileName: "src/allowed.ts",
    line: 3,
    column: 7
  },
  {
    name: "localFunction.const",
    fileName: "src/allowed.ts",
    line: 5,
    column: 7
  },
  {
    name: "LocalAlias.type",
    fileName: "src/allowed.ts",
    line: 7,
    column: 6
  },
  {
    name: "_unused.parameter",
    fileName: "src/allowed.ts",
    line: 9,
    column: 42
  },
  {
    name: "ExportedAlias.export",
    fileName: "src/allowed.ts",
    line: 14,
    column: 13
  }
]

const runNoUnusedFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) => Effect.runPromise(runCheckOnProject(noUnused)(project)))
  )

  return projectElements.flat()
}

test("no-unused reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoUnusedFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
