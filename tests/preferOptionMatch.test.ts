import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferOptionMatch } from "../src/rules/preferOptionMatch.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-option-match")

const message =
  "Avoid using Option.isSome/isNone in a ternary to unwrap an Option."

const hint =
  "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
  "instead of manually checking and accessing .value."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "isSome ternary accessing .value in whenTrue",
    ruleId: "prefer-option-match",
    fileName: "src/cases.ts",
    line: 28,
    column: 18,
    message,
    hint
  },
  {
    name: "isSome ternary with .value property access in whenTrue",
    ruleId: "prefer-option-match",
    fileName: "src/cases.ts",
    line: 36,
    column: 14,
    message,
    hint
  },
  {
    name: "isNone ternary accessing .value in whenFalse",
    ruleId: "prefer-option-match",
    fileName: "src/cases.ts",
    line: 40,
    column: 16,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "isSome returning the Option itself (orElse pattern)",
    fileName: "src/allowed.ts",
    line: 14,
    column: 16
  },
  {
    name: "standalone boolean isSome check",
    fileName: "src/allowed.ts",
    line: 20,
    column: 17
  },
  {
    name: "isSome in if-statement guard",
    fileName: "src/allowed.ts",
    line: 24,
    column: 5
  },
  {
    name: "isNone in if-statement guard",
    fileName: "src/allowed.ts",
    line: 30,
    column: 5
  }
]

const runPreferOptionMatchFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [preferOptionMatch])
  )
}

test("prefer-option-match reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferOptionMatchFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
