import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferConditionalReturn } from "../src/rules/preferConditionalReturn.js"
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
  "prefer-conditional-return"
)
const expectedMessage =
  "Avoid if statements that only choose between two return values."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "earlyReturn.if",
    ruleId: "prefer-conditional-return",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message: expectedMessage,
    hint: 'Return a conditional expression instead: return (ready) ? "yes" : "no".'
  },
  {
    name: "ifElseReturn.if",
    ruleId: "prefer-conditional-return",
    fileName: "src/cases.ts",
    line: 11,
    column: 3,
    message: expectedMessage,
    hint: 'Return a conditional expression instead: return (score > 0) ? "positive" : "non-positive".'
  },
  {
    name: "negatedCondition.if",
    ruleId: "prefer-conditional-return",
    fileName: "src/cases.ts",
    line: 19,
    column: 3,
    message: expectedMessage,
    hint: 'Return a conditional expression instead: return (ready) ? "open" : "blocked".'
  },
  {
    name: "bracelessThen.if",
    ruleId: "prefer-conditional-return",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: expectedMessage,
    hint: "Return a conditional expression instead: return (active) ? 1 : 0."
  },
  {
    name: "chooseVars.if",
    ruleId: "prefer-conditional-return",
    fileName: "src/cases.ts",
    line: 31,
    column: 3,
    message: expectedMessage,
    hint: "Return a conditional expression instead: return (useFirst) ? first : second."
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "elseIfChain.if",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3
  },
  {
    name: "notAReturn.if",
    fileName: "src/allowed.ts",
    line: 13,
    column: 3
  },
  {
    name: "elseNotValueReturn.if",
    fileName: "src/allowed.ts",
    line: 21,
    column: 3
  },
  {
    name: "multiStatement.if",
    fileName: "src/allowed.ts",
    line: 30,
    column: 3
  },
  {
    name: "bareReturn.if",
    fileName: "src/allowed.ts",
    line: 38,
    column: 3
  }
]

const runPreferConditionalReturnFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [preferConditionalReturn])
  )
}

test("prefer-conditional-return reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferConditionalReturnFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
