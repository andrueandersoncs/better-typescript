import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noLongComments } from "@better-typescript/checks/noLongComments"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-long-comments")

const message = "Comments must be at most 100 characters."

const hint =
  "Keep each comment within 100 characters because longer comments stop reading as code " +
  "annotations. State the single load-bearing reason; move longer explanations into an " +
  "Architectural Decision Record (ADR) in the adrs/ directory instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "comment one character over the limit",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message,
    hint
  },
  {
    name: "trailing comment over the limit",
    fileName: "src/cases.ts",
    line: 4,
    column: 25,
    message,
    hint
  },
  {
    name: "comment far over the limit",
    fileName: "src/cases.ts",
    line: 6,
    column: 1,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "comment exactly at the limit",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  },
  {
    name: "short comment",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  }
]

const runNoLongCommentsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(noLongComments))(project))
    )
  )

  return projectElements.flat()
}

test("no-long-comments reports overlong comments and permits comments within the limit", async () => {
  const signals = await runNoLongCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
