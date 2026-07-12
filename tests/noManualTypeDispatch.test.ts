import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noManualTypeDispatch } from "@better-typescript/checks/noManualTypeDispatch"
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
  "no-manual-type-dispatch"
)

const message =
  "Avoid dispatching on a value with a chain of if statements that each return."

const hint =
  "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
  "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
  "error rather than a silent fall-through."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "foldNode Schema.is dispatch chain",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message,
    hint
  },
  {
    name: "area discriminant property dispatch chain",
    fileName: "src/cases.ts",
    line: 27,
    column: 3,
    message,
    hint
  },
  {
    name: "classify predicate dispatch chain",
    fileName: "src/cases.ts",
    line: 39,
    column: 3,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "clamp two-guard early return",
    fileName: "src/allowed.ts",
    line: 5,
    column: 3
  },
  {
    name: "validate distinct-subject guards",
    fileName: "src/allowed.ts",
    line: 12,
    column: 3
  },
  {
    name: "accumulate non-exiting guards",
    fileName: "src/allowed.ts",
    line: 21,
    column: 3
  },
  {
    name: "describe else-if chain",
    fileName: "src/allowed.ts",
    line: 35,
    column: 3
  }
]

const runNoManualTypeDispatchFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noManualTypeDispatch)(project))
    )
  )

  return projectElements.flat()
}

test("no-manual-type-dispatch reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoManualTypeDispatchFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
