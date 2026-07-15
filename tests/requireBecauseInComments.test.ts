import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { requireBecauseInComments } from "@better-typescript/checks/requireBecauseInComments"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import { loadProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "require-because-in-comments")

const message = 'Comments must include the word "because".'

const hint =
  "Delete comments that only restate what the code does. Otherwise, explain why the " +
  'code or approach is necessary using the word "because". Structured JSDoc on an ' +
  "exported API (description plus at least one tag) is exempt because it documents an " +
  "API contract."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "description-only JSDoc on export",
    fileName: "src/cases.ts",
    line: 7,
    column: 1,
    message,
    hint
  },
  {
    name: "tags-only JSDoc on export",
    fileName: "src/cases.ts",
    line: 12,
    column: 1,
    message,
    hint
  },
  {
    name: "structured JSDoc on non-exported binding",
    fileName: "src/cases.ts",
    line: 17,
    column: 1,
    message,
    hint
  },
  {
    name: "line comment without because",
    fileName: "src/cases.ts",
    line: 25,
    column: 1,
    message,
    hint
  },
  {
    name: "block comment without because",
    fileName: "src/cases.ts",
    line: 28,
    column: 1,
    message,
    hint
  },
  {
    name: "trailing comment without because",
    fileName: "src/cases.ts",
    line: 31,
    column: 34,
    message,
    hint
  },
  {
    name: "because as part of another word",
    fileName: "src/cases.ts",
    line: 33,
    column: 32,
    message,
    hint
  },
  {
    name: "comment after comment-like literal text",
    fileName: "src/cases.ts",
    line: 39,
    column: 35,
    message,
    hint
  },
  {
    name: "comment inside an empty block",
    fileName: "src/cases.ts",
    line: 42,
    column: 3,
    message,
    hint
  },
  {
    name: "because in a longer Unicode word",
    fileName: "src/cases.ts",
    line: 45,
    column: 39,
    message,
    hint
  },
  {
    name: "empty block comment is not JSDoc",
    fileName: "src/cases.ts",
    line: 46,
    column: 1,
    message,
    hint
  },
  {
    name: "end-of-file comment without because",
    fileName: "src/cases.ts",
    line: 50,
    column: 1,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "structured JSDoc on exported API",
    fileName: "src/cases.ts",
    line: 1,
    column: 1
  },
  {
    name: "case-insensitive because",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  },
  {
    name: "block comment with because",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "trailing comment with because",
    fileName: "src/allowed.ts",
    line: 7,
    column: 34
  }
]

const runRequireBecauseInCommentsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(requireBecauseInComments)(project))
    )
  )

  return projectElements.flat()
}

test("require-because-in-comments reports non-JSDoc comments without because", async () => {
  const signals = await runRequireBecauseInCommentsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
