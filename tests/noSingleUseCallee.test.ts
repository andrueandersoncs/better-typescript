import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noSingleUseCallee } from "../src/rules/noSingleUseCallee.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-single-use-callee")

const expectedMessage =
  "Avoid naming a function that is only called in one place."
const expectedHint =
  "This function has a single call site and is not passed by reference anywhere. " +
  "Inline its body at the call site to reduce indirection. If the function exists " +
  "for documentation, a comment at the call site conveys the same intent without " +
  "the abstraction cost."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "singleUseNonCurriedArrow",
    ruleId: "no-single-use-callee",
    fileName: "src/cases.ts",
    line: 4,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "singleUseMultiLineArrow",
    ruleId: "no-single-use-callee",
    fileName: "src/cases.ts",
    line: 9,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "singleUseFunctionDeclaration",
    ruleId: "no-single-use-callee",
    fileName: "src/cases.ts",
    line: 19,
    column: 10,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "curriedFunction",
    fileName: "src/allowed.ts",
    line: 4,
    column: 7
  },
  {
    name: "exportedFunction",
    fileName: "src/allowed.ts",
    line: 12,
    column: 14
  },
  {
    name: "multiUseFunction",
    fileName: "src/allowed.ts",
    line: 18,
    column: 7
  },
  {
    name: "passedAsArgument",
    fileName: "src/allowed.ts",
    line: 24,
    column: 7
  },
  {
    name: "objectPropertyValue",
    fileName: "src/allowed.ts",
    line: 29,
    column: 7
  },
  {
    name: "assignedToVariable",
    fileName: "src/allowed.ts",
    line: 34,
    column: 7
  },
  {
    name: "deadCode",
    fileName: "src/allowed.ts",
    line: 39,
    column: 7
  }
]

const runNoSingleUseCalleeFixture = async (): Promise<
  ReadonlyArray<Finding>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noSingleUseCallee])(project)
  )
}

test("no-single-use-callee reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoSingleUseCalleeFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
