import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noFirstPartySchemaDeclare } from "@better-typescript/checks/noFirstPartySchemaDeclare"
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
  "no-first-party-schema-declare"
)

const hint =
  "Schema.declare is meant for integrating third-party types you do not control. " +
  "For types you own, define a proper Schema — for example class MyType extends " +
  'Schema.Class<MyType>("MyType")({ ... }) {} — which gives you validation, ' +
  "encoding, and decoding for free."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "Schema.declare with first-party type alias MyData",
    fileName: "src/cases.ts",
    line: 9,
    column: 22,
    message: 'Avoid Schema.declare for the first-party type "MyData".',
    hint
  },
  {
    name: "Schema.declare with first-party interface AppConfig",
    fileName: "src/cases.ts",
    line: 20,
    column: 25,
    message: 'Avoid Schema.declare for the first-party type "AppConfig".',
    hint
  },
  {
    name: "Schema.declare with inline predicate for first-party type MyData",
    fileName: "src/cases.ts",
    line: 23,
    column: 22,
    message: 'Avoid Schema.declare for the first-party type "MyData".',
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Schema.declare for third-party type ts.Node",
    fileName: "src/allowed.ts",
    line: 8,
    column: 22
  },
  {
    name: "Schema.declare for third-party type ts.Program",
    fileName: "src/allowed.ts",
    line: 13,
    column: 25
  },
  {
    name: "Schema.declare for first-party function type MyHandler",
    fileName: "src/allowed.ts",
    line: 21,
    column: 25
  },
  {
    name: "Schema.declare guarding a generic type parameter",
    fileName: "src/allowed.ts",
    line: 27,
    column: 33
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noFirstPartySchemaDeclare)(project))
    )
  )

  return projectElements.flat()
}

test("no-first-party-schema-declare reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
