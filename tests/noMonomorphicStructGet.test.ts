import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { noMonomorphicStructGet } from "../src/checks/noMonomorphicStructGet.js"
import type { Detection } from "../src/engine/check.js"
import { runCheckOnProject } from "../src/engine/report.js"
import { loadProject } from "../src/project/loadProject.js"
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
  "no-monomorphic-struct-get"
)

const message = "Avoid monomorphizing Struct.get at its declaration."

const hint =
  "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
  "domain type on the consuming value or result rather than on the getter."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "inline concrete function annotation",
    fileName: "src/cases.ts",
    line: 14,
    column: 19,
    message,
    hint
  },
  {
    name: "named concrete callable alias",
    fileName: "src/cases.ts",
    line: 15,
    column: 22,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "unannotated generic Struct.get",
    fileName: "src/allowed.ts",
    line: 20,
    column: 22
  },
  {
    name: "generic annotated callable",
    fileName: "src/allowed.ts",
    line: 22,
    column: 20
  },
  {
    name: "satisfies expression preserves inferred Struct.get type",
    fileName: "src/allowed.ts",
    line: 25,
    column: 32
  },
  {
    name: "exported binding keeps public API annotation",
    fileName: "src/allowed.ts",
    line: 27,
    column: 28
  },
  {
    name: "inline Struct.get at typed Order consumer",
    fileName: "src/allowed.ts",
    line: 31,
    column: 3
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noMonomorphicStructGet)(project))
    )
  )

  return projectElements.flat()
}

test("no-monomorphic-struct-get reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
