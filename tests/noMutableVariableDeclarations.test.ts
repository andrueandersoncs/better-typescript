import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMutableVariableDeclarations } from "../src/rules/noMutableVariableDeclarations.js"
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
  "no-mutable-variable-declarations"
)

const expectedHint =
  "Declare multiple const values to represent each state instead of mutating a single " +
  "variable, and use immutable values that are not reassigned."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "let single declarator",
    ruleId: "no-mutable-variable-declarations",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message: "Avoid declaring mutable variables with let.",
    hint: expectedHint
  },
  {
    name: "var single declarator",
    ruleId: "no-mutable-variable-declarations",
    fileName: "src/cases.ts",
    line: 5,
    column: 1,
    message: "Avoid declaring mutable variables with var.",
    hint: expectedHint
  },
  {
    name: "let multi-declarator (one match)",
    ruleId: "no-mutable-variable-declarations",
    fileName: "src/cases.ts",
    line: 7,
    column: 1,
    message: "Avoid declaring mutable variables with let.",
    hint: expectedHint
  },
  {
    name: "let uninitialized with type annotation",
    ruleId: "no-mutable-variable-declarations",
    fileName: "src/cases.ts",
    line: 10,
    column: 1,
    message: "Avoid declaring mutable variables with let.",
    hint: expectedHint
  },
  {
    name: "let in for-loop initializer",
    ruleId: "no-mutable-variable-declarations",
    fileName: "src/cases.ts",
    line: 12,
    column: 6,
    message: "Avoid declaring mutable variables with let.",
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "const single declarator (total)",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  },
  {
    name: "const single declarator (label)",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "const multi-declarator",
    fileName: "src/allowed.ts",
    line: 6,
    column: 1
  },
  {
    name: "const destructuring object",
    fileName: "src/allowed.ts",
    line: 8,
    column: 1
  },
  {
    name: "const destructuring array",
    fileName: "src/allowed.ts",
    line: 9,
    column: 1
  },
  {
    name: "const in for-of initializer",
    fileName: "src/allowed.ts",
    line: 11,
    column: 6
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [noMutableVariableDeclarations])
  )
}

test("no-mutable-variable-declarations reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
