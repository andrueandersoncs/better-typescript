import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectRecordFilterMap } from "../src/rules/preferEffectRecordFilterMap.js"
import type { RuleMatch } from "../src/rules/index.js"
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
  "prefer-effect-record-filter-map"
)
const expectedMessage = "Avoid conditional object spreads."
const expectedHint =
  "Build a record of candidate properties and use Record.filterMap from Effect " +
  "with Option.some/Option.none (or Option.fromNullable) to keep only present entries."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "truthy value adds field",
    ruleId: "prefer-effect-record-filter-map",
    fileName: "src/cases.ts",
    line: 12,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "empty object in true branch",
    ruleId: "prefer-effect-record-filter-map",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "parenthesized conditional",
    ruleId: "prefer-effect-record-filter-map",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "multi-property branch",
    ruleId: "prefer-effect-record-filter-map",
    fileName: "src/cases.ts",
    line: 32,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "unconditional spread",
    fileName: "src/allowed.ts",
    line: 11,
    column: 5
  },
  {
    name: "conditional object expression outside spread",
    fileName: "src/allowed.ts",
    line: 15,
    column: 20
  },
  {
    name: "conditional chooses between populated objects",
    fileName: "src/allowed.ts",
    line: 20,
    column: 5
  },
  {
    name: "conditional chooses object variable",
    fileName: "src/allowed.ts",
    line: 26,
    column: 5
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  return workspace.projects.flatMap((project) =>
    runRules(project, [preferEffectRecordFilterMap])
  )
}

test("prefer-effect-record-filter-map reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()
  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
