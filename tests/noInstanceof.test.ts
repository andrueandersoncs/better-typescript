import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noInstanceof } from "../src/rules/noInstanceof.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-instanceof")

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "instanceof with first-party class AppError",
    ruleId: "no-instanceof",
    fileName: "src/cases.ts",
    line: 6,
    column: 27,
    message: 'Avoid instanceof for the first-party class "AppError".',
    hint:
      "Use Schema.is(AppError)(value) or a Schema-based type guard instead of instanceof. " +
      "Schema.is is structural, works across realms, and stays consistent with " +
      "the Effect type system."
  },
  {
    name: "instanceof with first-party class Config",
    ruleId: "no-instanceof",
    fileName: "src/cases.ts",
    line: 13,
    column: 25,
    message: 'Avoid instanceof for the first-party class "Config".',
    hint:
      "Use Schema.is(Config)(value) or a Schema-based type guard instead of instanceof. " +
      "Schema.is is structural, works across realms, and stays consistent with " +
      "the Effect type system."
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "instanceof with built-in Error (third-party)",
    fileName: "src/allowed.ts",
    line: 6,
    column: 24
  },
  {
    name: "instanceof with built-in Date (third-party)",
    fileName: "src/allowed.ts",
    line: 9,
    column: 23
  },
  {
    name: "Schema.is type guard (no instanceof)",
    fileName: "src/allowed.ts",
    line: 17,
    column: 27
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noInstanceof]))
}

test("no-instanceof reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
