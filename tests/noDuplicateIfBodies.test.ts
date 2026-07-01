import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noDuplicateIfBodies } from "../src/rules/noDuplicateIfBodies.js"
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
  "no-duplicate-if-bodies"
)
const expectedMessage =
  "Avoid if branches that repeat the body of the branch before them."

const hintFor = (combinedCondition: string): string =>
  "These branches are pseudo-duplicates: the bodies are identical and only the " +
  "conditions differ. Combine them into a single branch: " +
  `if (${combinedCondition}) { ... }.`

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "adjacentGuardDuplicate.secondIf",
    ruleId: "no-duplicate-if-bodies",
    fileName: "src/cases.ts",
    line: 7,
    column: 3,
    message: expectedMessage,
    hint: hintFor('input === "empty" || input === "blank"')
  },
  {
    name: "unwrappedGuardDuplicate.secondIf",
    ruleId: "no-duplicate-if-bodies",
    fileName: "src/cases.ts",
    line: 14,
    column: 3,
    message: expectedMessage,
    hint: hintFor('input === "one" || input === "two"')
  },
  {
    name: "elseIfDuplicate.elseIf",
    ruleId: "no-duplicate-if-bodies",
    fileName: "src/cases.ts",
    line: 22,
    column: 10,
    message: expectedMessage,
    hint: hintFor('input === "short" || input === "tiny"')
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "adjacentGuardDuplicate.firstIf",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3
  },
  {
    name: "unwrappedGuardDuplicate.firstIf",
    fileName: "src/allowed.ts",
    line: 10,
    column: 3
  },
  {
    name: "elseIfDuplicate.firstIf",
    fileName: "src/allowed.ts",
    line: 15,
    column: 3
  },
  {
    name: "nonExitingGuardDuplicate.firstIf",
    fileName: "src/allowed.ts",
    line: 22,
    column: 3
  },
  {
    name: "nonExitingGuardDuplicate.secondIf",
    fileName: "src/allowed.ts",
    line: 25,
    column: 3
  },
  {
    name: "separatedGuardDuplicate.firstIf",
    fileName: "src/allowed.ts",
    line: 31,
    column: 3
  },
  {
    name: "separatedGuardDuplicate.secondIf",
    fileName: "src/allowed.ts",
    line: 35,
    column: 3
  },
  {
    name: "guardWithElseIsIgnored.firstIf",
    fileName: "src/allowed.ts",
    line: 41,
    column: 3
  },
  {
    name: "guardWithElseIsIgnored.secondIf",
    fileName: "src/allowed.ts",
    line: 46,
    column: 3
  },
  {
    name: "differentGuardBodies.firstIf",
    fileName: "src/allowed.ts",
    line: 52,
    column: 3
  },
  {
    name: "differentGuardBodies.secondIf",
    fileName: "src/allowed.ts",
    line: 55,
    column: 3
  }
]

const runNoDuplicateIfBodiesFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noDuplicateIfBodies])(project)
  )
}

test("no-duplicate-if-bodies reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoDuplicateIfBodiesFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
