import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMultiLineComments } from "../src/rules/noMultiLineComments.js"
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
  "no-multi-line-comments"
)

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use single-line comments only to explain WHY " +
  "something is done, never HOW. For architectural decisions that require longer " +
  "explanation, create an Architectural Decision Record (ADR) as a markdown file in " +
  "the adrs/ directory instead."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "JSDoc block comment",
    ruleId: "no-multi-line-comments",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message,
    hint
  },
  {
    name: "multi-line block comment",
    ruleId: "no-multi-line-comments",
    fileName: "src/cases.ts",
    line: 6,
    column: 1,
    message,
    hint
  },
  {
    name: "adjacent single-line comment run (2 lines)",
    ruleId: "no-multi-line-comments",
    fileName: "src/cases.ts",
    line: 12,
    column: 1,
    message,
    hint
  },
  {
    name: "adjacent single-line comment run (3 lines)",
    ruleId: "no-multi-line-comments",
    fileName: "src/cases.ts",
    line: 18,
    column: 1,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "single-line block comment",
    fileName: "src/allowed.ts",
    line: 1,
    column: 1
  },
  {
    name: "lone single-line comment",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "isolated comment after gap",
    fileName: "src/allowed.ts",
    line: 10,
    column: 1
  },
  {
    name: "another isolated comment",
    fileName: "src/allowed.ts",
    line: 13,
    column: 1
  }
]

const runNoMultiLineCommentsFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noMultiLineComments])(project)
  )
}

test("no-multi-line-comments reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoMultiLineCommentsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
