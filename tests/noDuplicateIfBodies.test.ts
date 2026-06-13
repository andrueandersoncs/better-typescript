import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noDuplicateIfBodies } from "../src/rules/noDuplicateIfBodies.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"

interface MatchDetails {
  readonly ruleId: string
  readonly fileName: string
  readonly line: number
  readonly column: number
  readonly message: string
  readonly hint: string
}

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-duplicate-if-bodies")
const expectedMessage = "Avoid if branches that repeat the body of the branch before them."

const hintFor = (combinedCondition: string): string =>
  "These branches are pseudo-duplicates: the bodies are identical and only the " +
  "conditions differ. Combine them into a single branch: " +
  `if (${combinedCondition}) { ... }.`

const matchDetails = (match: RuleMatch): MatchDetails => ({
  ruleId: match.ruleId,
  fileName: match.fileName,
  line: match.line,
  column: match.column,
  message: match.message,
  hint: match.hint
})

const runNoDuplicateIfBodiesFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noDuplicateIfBodies]))
}

test("no-duplicate-if-bodies reports adjacent duplicate if bodies", async () => {
  const matches = await runNoDuplicateIfBodiesFixture()

  assert.deepEqual(matches.map(matchDetails), [
    {
      ruleId: "no-duplicate-if-bodies",
      fileName: "src/cases.ts",
      line: 7,
      column: 3,
      message: expectedMessage,
      hint: hintFor('input === "empty" || input === "blank"')
    },
    {
      ruleId: "no-duplicate-if-bodies",
      fileName: "src/cases.ts",
      line: 15,
      column: 3,
      message: expectedMessage,
      hint: hintFor('input === "one" || input === "two"')
    },
    {
      ruleId: "no-duplicate-if-bodies",
      fileName: "src/cases.ts",
      line: 23,
      column: 10,
      message: expectedMessage,
      hint: hintFor('input === "short" || input === "tiny"')
    }
  ])
})
