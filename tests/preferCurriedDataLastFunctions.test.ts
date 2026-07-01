import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferCurriedDataLastFunctions } from "../src/rules/preferCurriedDataLastFunctions.js"
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
  "prefer-curried-data-last-functions"
)

const message = "Prefer curried, data-last functions."

const hint =
  "Split this function into one parameter per arrow, applying configuration first and " +
  "the data argument last. If a third-party callback dictates this shape, keep it " +
  "behind the typed callback boundary."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "combineValues two-parameter arrow",
    ruleId: "prefer-curried-data-last-functions",
    fileName: "src/cases.ts",
    line: 1,
    column: 30,
    message,
    hint
  },
  {
    name: "collectValues rest-parameter arrow",
    ruleId: "prefer-curried-data-last-functions",
    fileName: "src/cases.ts",
    line: 4,
    column: 30,
    message,
    hint
  },
  {
    name: "multiplyValues two-parameter function expression",
    ruleId: "prefer-curried-data-last-functions",
    fileName: "src/cases.ts",
    line: 6,
    column: 31,
    message,
    hint
  },
  {
    name: "clampRange multi-parameter outer arrow returning another arrow",
    ruleId: "prefer-curried-data-last-functions",
    fileName: "src/cases.ts",
    line: 13,
    column: 27,
    message,
    hint
  },
  {
    name: "ruleStyleMatches first-party handler reference",
    ruleId: "prefer-curried-data-last-functions",
    fileName: "src/cases.ts",
    line: 25,
    column: 26,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "appendSuffix curried data-last arrow",
    fileName: "src/allowed.ts",
    line: 3,
    column: 29
  },
  {
    name: "doubleValue single-parameter arrow",
    fileName: "src/allowed.ts",
    line: 6,
    column: 28
  },
  {
    name: "readDefault zero-parameter thunk",
    fileName: "src/allowed.ts",
    line: 8,
    column: 28
  },
  {
    name: "sumInlineReduce callback shape dictated by Array.prototype.reduce",
    fileName: "src/allowed.ts",
    line: 11,
    column: 17
  },
  {
    name: "typedReducer two-parameter typed callback variable",
    fileName: "src/allowed.ts",
    line: 13,
    column: 38
  },
  {
    name: "namedReducer two-parameter callback passed to reduce by reference",
    fileName: "src/allowed.ts",
    line: 15,
    column: 22
  }
]

const runPreferCurriedDataLastFunctionsFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferCurriedDataLastFunctions])(project)
  )
}

test("prefer-curried-data-last-functions reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferCurriedDataLastFunctionsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
