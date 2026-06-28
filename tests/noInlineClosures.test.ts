import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noInlineClosures } from "../src/rules/noInlineClosures.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-inline-closures")
const expectedMessage =
  "Avoid arrow functions outside naming and currying positions."
const expectedHint =
  "Name this function as a top-level const and pass it by reference, currying it when it " +
  "needs values from the enclosing scope. When the expression sequences several steps, " +
  "prefer a generator (Option.gen or Effect.gen) over nesting functions."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "callArgument",
    ruleId: "no-inline-closures",
    fileName: "src/cases.ts",
    line: 5,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "objectPropertyValue",
    ruleId: "no-inline-closures",
    fileName: "src/cases.ts",
    line: 8,
    column: 30,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "arrayElement",
    ruleId: "no-inline-closures",
    fileName: "src/cases.ts",
    line: 11,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "returnedArrow",
    ruleId: "no-inline-closures",
    fileName: "src/cases.ts",
    line: 15,
    column: 22,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "conditionalBranch.true",
    ruleId: "no-inline-closures",
    fileName: "src/cases.ts",
    line: 20,
    column: 30,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "conditionalBranch.false",
    ruleId: "no-inline-closures",
    fileName: "src/cases.ts",
    line: 20,
    column: 49,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "namedConstArrow",
    fileName: "src/allowed.ts",
    line: 4,
    column: 32
  },
  {
    name: "curriedOuter",
    fileName: "src/allowed.ts",
    line: 7,
    column: 25
  },
  {
    name: "curriedInner",
    fileName: "src/allowed.ts",
    line: 7,
    column: 48
  },
  {
    name: "parenthesizedConstArrow",
    fileName: "src/allowed.ts",
    line: 10,
    column: 32
  },
  {
    name: "satisfiesWrappedConstArrow",
    fileName: "src/allowed.ts",
    line: 13,
    column: 24
  }
]

const runNoInlineClosuresFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [noInlineClosures])
  )
}

test("no-inline-closures reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoInlineClosuresFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
