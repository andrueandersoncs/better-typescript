import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noTryCatch } from "../src/rules/noTryCatch.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-try-catch")

const expectedMessage = "Avoid try/catch for error handling."
const expectedHint =
  "Model effectful code that can fail as an Effect and declare its failures as explicit " +
  'Schema.TaggedError classes, for example: class FetchError extends Schema.TaggedError<FetchError>("FetchError")("FetchError", {}) {}. ' +
  "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catchAll) instead of catching inside a try block."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "tryCatch",
    ruleId: "no-try-catch",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "tryFinally",
    ruleId: "no-try-catch",
    fileName: "src/cases.ts",
    line: 12,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "tryCatchFinally",
    ruleId: "no-try-catch",
    fileName: "src/cases.ts",
    line: 20,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "tryInArrow",
    ruleId: "no-try-catch",
    fileName: "src/cases.ts",
    line: 30,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nestedTry outer",
    ruleId: "no-try-catch",
    fileName: "src/cases.ts",
    line: 38,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "nestedTry inner",
    ruleId: "no-try-catch",
    fileName: "src/cases.ts",
    line: 39,
    column: 5,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "tryAgain.identifier",
    fileName: "src/allowed.ts",
    line: 3,
    column: 7
  },
  {
    name: "catchAll.property",
    fileName: "src/allowed.ts",
    line: 5,
    column: 28
  },
  {
    name: "promiseCatch.method",
    fileName: "src/allowed.ts",
    line: 8,
    column: 9
  },
  {
    name: "catchTag.identifier",
    fileName: "src/allowed.ts",
    line: 10,
    column: 7
  },
  {
    name: "label.string",
    fileName: "src/allowed.ts",
    line: 14,
    column: 7
  }
]

const runNoTryCatchFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noTryCatch])(project)
  )
}

test("no-try-catch reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoTryCatchFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
