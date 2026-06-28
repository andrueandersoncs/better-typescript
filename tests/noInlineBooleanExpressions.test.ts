import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noInlineBooleanExpressions } from "../src/rules/noInlineBooleanExpressions.js"
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
  "no-inline-boolean-expressions"
)
const expectedMessage =
  "Avoid boolean operators inline in an if statement condition."
const expectedHint =
  "Extract the expression into a well-named const variable declaration above the if " +
  "statement and use that variable in the if condition."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "requiresBoth.condition",
    ruleId: "no-inline-boolean-expressions",
    fileName: "src/cases.ts",
    line: 4,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "allowsEither.condition",
    ruleId: "no-inline-boolean-expressions",
    fileName: "src/cases.ts",
    line: 12,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "unwrapsParenthesized.condition",
    ruleId: "no-inline-boolean-expressions",
    fileName: "src/cases.ts",
    line: 20,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "ignoresExtractedCondition.condition",
    fileName: "src/allowed.ts",
    line: 6,
    column: 7
  },
  {
    name: "ignoresSingleCondition.condition",
    fileName: "src/allowed.ts",
    line: 14,
    column: 7
  },
  {
    name: "ignoresComparison.condition",
    fileName: "src/allowed.ts",
    line: 22,
    column: 7
  }
]

const runNoInlineBooleanExpressionsFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [noInlineBooleanExpressions])
  )
}

test("no-inline-boolean-expressions reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoInlineBooleanExpressionsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
