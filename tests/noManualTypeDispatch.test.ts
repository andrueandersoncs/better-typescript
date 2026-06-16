import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noManualTypeDispatch } from "../src/rules/noManualTypeDispatch.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-manual-type-dispatch")

const message = "Avoid dispatching on a value with a chain of if statements that each return."

const hint =
  "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
  "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
  "error rather than a silent fall-through."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "foldNode Schema.is dispatch chain",
    ruleId: "no-manual-type-dispatch",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message,
    hint
  },
  {
    name: "area discriminant property dispatch chain",
    ruleId: "no-manual-type-dispatch",
    fileName: "src/cases.ts",
    line: 27,
    column: 3,
    message,
    hint
  },
  {
    name: "classify predicate dispatch chain",
    ruleId: "no-manual-type-dispatch",
    fileName: "src/cases.ts",
    line: 39,
    column: 3,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "clamp two-guard early return",
    fileName: "src/allowed.ts",
    line: 5,
    column: 3
  },
  {
    name: "validate distinct-subject guards",
    fileName: "src/allowed.ts",
    line: 12,
    column: 3
  },
  {
    name: "accumulate non-exiting guards",
    fileName: "src/allowed.ts",
    line: 21,
    column: 3
  },
  {
    name: "describe else-if chain",
    fileName: "src/allowed.ts",
    line: 35,
    column: 3
  }
]

const runNoManualTypeDispatchFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noManualTypeDispatch]))
}

test("no-manual-type-dispatch reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoManualTypeDispatchFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
