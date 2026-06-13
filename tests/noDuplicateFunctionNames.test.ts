import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noDuplicateFunctionNames } from "../src/rules/noDuplicateFunctionNames.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-duplicate-function-names")

const messageFor = (functionName: string): string =>
  `Avoid declaring the top-level function ${functionName} in multiple files.`

const hintFor = (functionName: string, otherFiles: string): string =>
  `${functionName} is also declared in ${otherFiles}. Extract one shared implementation ` +
  "into a module scoped to its domain and import it from every file that uses it. Name " +
  "the module after the concept it serves (ts.Node helpers belong in ts-node.ts), not a " +
  "generic lib.ts or utils.ts."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "alpha.sharedDeclaration",
    ruleId: "no-duplicate-function-names",
    fileName: "src/alpha.ts",
    line: 3,
    column: 10,
    message: messageFor("sharedDeclaration"),
    hint: hintFor("sharedDeclaration", "src/beta.ts")
  },
  {
    name: "alpha.sharedArrow",
    ruleId: "no-duplicate-function-names",
    fileName: "src/alpha.ts",
    line: 5,
    column: 7,
    message: messageFor("sharedArrow"),
    hint: hintFor("sharedArrow", "src/beta.ts")
  },
  {
    name: "alpha.sharedExpression",
    ruleId: "no-duplicate-function-names",
    fileName: "src/alpha.ts",
    line: 7,
    column: 7,
    message: messageFor("sharedExpression"),
    hint: hintFor("sharedExpression", "src/gamma.ts")
  },
  {
    name: "alpha.crowded",
    ruleId: "no-duplicate-function-names",
    fileName: "src/alpha.ts",
    line: 9,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor("crowded", "src/beta.ts, src/gamma.ts, src/delta.ts and 1 more file")
  },
  {
    name: "beta.sharedDeclaration",
    ruleId: "no-duplicate-function-names",
    fileName: "src/beta.ts",
    line: 3,
    column: 10,
    message: messageFor("sharedDeclaration"),
    hint: hintFor("sharedDeclaration", "src/alpha.ts")
  },
  {
    name: "beta.sharedArrow",
    ruleId: "no-duplicate-function-names",
    fileName: "src/beta.ts",
    line: 5,
    column: 7,
    message: messageFor("sharedArrow"),
    hint: hintFor("sharedArrow", "src/alpha.ts")
  },
  {
    name: "beta.crowded",
    ruleId: "no-duplicate-function-names",
    fileName: "src/beta.ts",
    line: 7,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor("crowded", "src/alpha.ts, src/gamma.ts, src/delta.ts and 1 more file")
  },
  {
    name: "gamma.sharedExpression",
    ruleId: "no-duplicate-function-names",
    fileName: "src/gamma.ts",
    line: 3,
    column: 7,
    message: messageFor("sharedExpression"),
    hint: hintFor("sharedExpression", "src/alpha.ts")
  },
  {
    name: "gamma.crowded",
    ruleId: "no-duplicate-function-names",
    fileName: "src/gamma.ts",
    line: 5,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor("crowded", "src/alpha.ts, src/beta.ts, src/delta.ts and 1 more file")
  },
  {
    name: "delta.crowded",
    ruleId: "no-duplicate-function-names",
    fileName: "src/delta.ts",
    line: 3,
    column: 10,
    message: messageFor("crowded"),
    hint: hintFor("crowded", "src/alpha.ts, src/beta.ts, src/gamma.ts and 1 more file")
  },
  {
    name: "epsilon.crowded",
    ruleId: "no-duplicate-function-names",
    fileName: "src/epsilon.ts",
    line: 3,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor("crowded", "src/alpha.ts, src/beta.ts, src/gamma.ts and 1 more file")
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "alpha.localOverload.stringSignature",
    fileName: "src/alpha.ts",
    line: 11,
    column: 10
  },
  {
    name: "alpha.localOverload.numberSignature",
    fileName: "src/alpha.ts",
    line: 12,
    column: 10
  },
  {
    name: "alpha.localOverload.implementation",
    fileName: "src/alpha.ts",
    line: 13,
    column: 10
  },
  {
    name: "alpha.containsNested",
    fileName: "src/alpha.ts",
    line: 17,
    column: 10
  },
  {
    name: "alpha.containsNested.sharedDeclaration",
    fileName: "src/alpha.ts",
    line: 18,
    column: 12
  },
  {
    name: "AlphaService.sharedArrow",
    fileName: "src/alpha.ts",
    line: 23,
    column: 3
  },
  {
    name: "objectLiteral.sharedExpression",
    fileName: "src/alpha.ts",
    line: 27,
    column: 3
  },
  {
    name: "alpha.valueOnly",
    fileName: "src/alpha.ts",
    line: 30,
    column: 10
  },
  {
    name: "beta.betaOnly",
    fileName: "src/beta.ts",
    line: 9,
    column: 7
  },
  {
    name: "beta.valueOnly",
    fileName: "src/beta.ts",
    line: 11,
    column: 7
  }
]

const runNoDuplicateFunctionNamesFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noDuplicateFunctionNames]))
}

test("no-duplicate-function-names reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoDuplicateFunctionNamesFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
