import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noForOfLoops } from "@better-typescript/checks/noForOfLoops"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-for-of-loops")
const expectedMessage = "Avoid imperative logic in for..of loops."
const synchronousHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."
const asynchronousHint =
  "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another " +
  "Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "collectValues.forOfLoop",
    fileName: "src/cases.ts",
    line: 6,
    column: 3,
    message: expectedMessage,
    hint: synchronousHint
  },
  {
    name: "collectAsyncValues.forAwaitOfLoop",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: asynchronousHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "collectionOperationsAreAllowed",
    fileName: "src/allowed.ts",
    line: 5,
    column: 10
  },
  {
    name: "async collection operations are allowed",
    fileName: "src/allowed.ts",
    line: 15,
    column: 14
  }
]

const runNoForOfLoopsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(noForOfLoops))(project))
    )
  )

  return projectElements.flat()
}

test("no-for-of-loops reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoForOfLoopsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
