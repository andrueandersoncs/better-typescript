import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noNonNullAssertion } from "../src/rules/noNonNullAssertion.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "no-non-null-assertion"
)

const message = "Avoid non-null assertions."

const hint =
  "The ! operator silences the type checker instead of handling the absent case, " +
  "trading a compile-time proof for a runtime crash. Convert the nullable value " +
  "with Option.fromNullable and handle both branches (Option.match, " +
  "Option.getOrElse), or narrow it with a type guard the checker verifies."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "bare non-null assertion",
    ruleId: "no-non-null-assertion",
    fileName: "src/cases.ts",
    line: 7,
    column: 25,
    message,
    hint
  },
  {
    name: "non-null assertion feeding a call",
    ruleId: "no-non-null-assertion",
    fileName: "src/cases.ts",
    line: 9,
    column: 26,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Option.fromNullable conversion",
    fileName: "src/allowed.ts",
    line: 9,
    column: 19
  },
  {
    name: "Option.getOrElse handling",
    fileName: "src/allowed.ts",
    line: 11,
    column: 28
  }
]

const runFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noNonNullAssertion])(project)
  )
}

test("no-non-null-assertion reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
