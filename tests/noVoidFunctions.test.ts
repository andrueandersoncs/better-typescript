import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noVoidFunctions } from "../src/rules/noVoidFunctions.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-void-functions")

const message = "Avoid functions that return void."

const hint =
  "A void function either does nothing or performs a side-effect. If it does nothing, " +
  "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
  "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not run."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "logMessage explicit void arrow",
    ruleId: "no-void-functions",
    fileName: "src/cases.ts",
    line: 4,
    column: 27,
    message,
    hint
  },
  {
    name: "resetTotal explicit void function declaration",
    ruleId: "no-void-functions",
    fileName: "src/cases.ts",
    line: 8,
    column: 17,
    message,
    hint
  },
  {
    name: "addToTotal inferred void arrow",
    ruleId: "no-void-functions",
    fileName: "src/cases.ts",
    line: 12,
    column: 27,
    message,
    hint
  },
  {
    name: "noop anonymous void function expression",
    ruleId: "no-void-functions",
    fileName: "src/cases.ts",
    line: 16,
    column: 21,
    message,
    hint
  },
  {
    name: "Counter.increment void method",
    ruleId: "no-void-functions",
    fileName: "src/cases.ts",
    line: 21,
    column: 3,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "increment returns number",
    fileName: "src/allowed.ts",
    line: 3,
    column: 27
  },
  {
    name: "fetchUser returns Effect",
    fileName: "src/allowed.ts",
    line: 5,
    column: 27
  },
  {
    name: "describe returns string",
    fileName: "src/allowed.ts",
    line: 7,
    column: 17
  },
  {
    name: "Box constructor",
    fileName: "src/allowed.ts",
    line: 13,
    column: 3
  },
  {
    name: "Box current setter",
    fileName: "src/allowed.ts",
    line: 21,
    column: 7
  },
  {
    name: "Box read returns number",
    fileName: "src/allowed.ts",
    line: 25,
    column: 3
  }
]

const runNoVoidFunctionsFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noVoidFunctions]))
}

test("no-void-functions reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoVoidFunctionsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
