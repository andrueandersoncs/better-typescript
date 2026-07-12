import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noRootLevelClasses } from "@better-typescript/checks/noRootLevelClasses"
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
  "no-root-level-classes"
)

const expectedMessage = "Avoid classes that do not extend another class."

const expectedHint =
  "Classes should never implement data structures, algorithms, or modules — model those " +
  "with a functional approach (plain functions over Effect data types). The only sanctioned " +
  "use of a class is integrating with a third-party library that requires subclassing, so " +
  "every class must extend some other class as proof of that integration — for example " +
  "extending Effect's Schema.Class, Schema.TaggedError, Data.TaggedClass, or a base class " +
  "from the library you are integrating with."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "Container class declaration without heritage",
    fileName: "src/cases.ts",
    line: 7,
    column: 14,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Person class declaration that only implements an interface",
    fileName: "src/cases.ts",
    line: 11,
    column: 14,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Widget class declaration nested inside a function",
    fileName: "src/cases.ts",
    line: 16,
    column: 9,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "Anonymous class expression without heritage",
    fileName: "src/cases.ts",
    line: 23,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "DomainError extends Error",
    fileName: "src/allowed.ts",
    line: 7,
    column: 14
  },
  {
    name: "Person extends Schema.Class",
    fileName: "src/allowed.ts",
    line: 11,
    column: 14
  },
  {
    name: "NamedError extends Error and implements an interface",
    fileName: "src/allowed.ts",
    line: 15,
    column: 14
  },
  {
    name: "Anonymous class expression extends Error",
    fileName: "src/allowed.ts",
    line: 19,
    column: 26
  }
]

const runNoRootLevelClassesFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noRootLevelClasses)(project))
    )
  )

  return projectElements.flat()
}

test("no-root-level-classes reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoRootLevelClassesFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
