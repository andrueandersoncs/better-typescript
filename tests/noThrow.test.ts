import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noThrow } from "../src/rules/noThrow.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-throw")
const expectedMessage = "Avoid throwing errors with throw."
const expectedHint =
  "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
  'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "topLevelThrow",
    ruleId: "no-throw",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "throwInIfBlock",
    ruleId: "no-throw",
    fileName: "src/cases.ts",
    line: 9,
    column: 5,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "throwInCatch",
    ruleId: "no-throw",
    fileName: "src/cases.ts",
    line: 19,
    column: 5,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "throwInArrowBody",
    ruleId: "no-throw",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "returnsError.function",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  },
  {
    name: "rethrow.identifier",
    fileName: "src/allowed.ts",
    line: 7,
    column: 7
  },
  {
    name: "throwLabel.property",
    fileName: "src/allowed.ts",
    line: 9,
    column: 13
  },
  {
    name: "message.string",
    fileName: "src/allowed.ts",
    line: 11,
    column: 7
  }
]

const runNoThrowFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules([noThrow])(project))
}

test("no-throw reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoThrowFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
