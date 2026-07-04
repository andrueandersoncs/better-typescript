import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectArrayAppendAll } from "../src/rules/preferEffectArrayAppendAll.js"
import type { Finding } from "../src/rules/index.js"
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
  "prefer-effect-array-append-all"
)
const expectedMessage = "Avoid conditional array spreads."
const expectedHint =
  "Use Array.appendAll from Effect to combine arrays instead of spreading a " +
  "conditional expression that chooses between an array and an empty array literal."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "empty array in false branch",
    ruleId: "prefer-effect-array-append-all",
    fileName: "src/cases.ts",
    line: 7,
    column: 29,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "empty array in true branch",
    ruleId: "prefer-effect-array-append-all",
    fileName: "src/cases.ts",
    line: 9,
    column: 28,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "parenthesized conditional",
    ruleId: "prefer-effect-array-append-all",
    fileName: "src/cases.ts",
    line: 11,
    column: 35,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "non-literal true branch with empty false branch",
    ruleId: "prefer-effect-array-append-all",
    fileName: "src/cases.ts",
    line: 13,
    column: 31,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "unconditional spread",
    fileName: "src/allowed.ts",
    line: 7,
    column: 30
  },
  {
    name: "conditional outside spread",
    fileName: "src/allowed.ts",
    line: 9,
    column: 34
  },
  {
    name: "both branches populated",
    fileName: "src/allowed.ts",
    line: 11,
    column: 32
  },
  {
    name: "both branches empty",
    fileName: "src/allowed.ts",
    line: 13,
    column: 28
  },
  {
    name: "spread in function call",
    fileName: "src/allowed.ts",
    line: 15,
    column: 39
  }
]

const runFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  return workspace.projects.flatMap((project) =>
    runRules([preferEffectArrayAppendAll])(project)
  )
}

test("prefer-effect-array-append-all reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()
  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
