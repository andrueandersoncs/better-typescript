import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectArrayAppendAll } from "../src/rules/preferEffectArrayAppendAll.js"
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
    line: 8,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "empty array in true branch",
    ruleId: "prefer-effect-array-append-all",
    fileName: "src/cases.ts",
    line: 13,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "parenthesized conditional",
    ruleId: "prefer-effect-array-append-all",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "non-literal true branch with empty false branch",
    ruleId: "prefer-effect-array-append-all",
    fileName: "src/cases.ts",
    line: 23,
    column: 3,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "unconditional spread",
    fileName: "src/allowed.ts",
    line: 8,
    column: 3
  },
  {
    name: "conditional outside spread",
    fileName: "src/allowed.ts",
    line: 12,
    column: 7
  },
  {
    name: "both branches populated",
    fileName: "src/allowed.ts",
    line: 15,
    column: 3
  },
  {
    name: "both branches empty",
    fileName: "src/allowed.ts",
    line: 19,
    column: 3
  },
  {
    name: "spread in function call",
    fileName: "src/allowed.ts",
    line: 22,
    column: 36
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  return workspace.projects.flatMap((project) =>
    runRules(project, [preferEffectArrayAppendAll])
  )
}

test("prefer-effect-array-append-all reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()
  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
