import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noForInLoops } from "../src/rules/noForInLoops.js"
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
const fixturePath = path.join(testDirectory, "fixtures", "no-for-in-loops")
const expectedMessage = "Avoid imperative logic in for..in loops."
const expectedHint =
  "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
  "or Record.toEntries(), instead."

const matchDetails = (match: RuleMatch): MatchDetails => ({
  ruleId: match.ruleId,
  fileName: match.fileName,
  line: match.line,
  column: match.column,
  message: match.message,
  hint: match.hint
})

const runNoForInLoopsFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noForInLoops]))
}

test("no-for-in-loops reports for-in loops", async () => {
  const matches = await runNoForInLoopsFixture()

  assert.deepEqual(matches.map(matchDetails), [
    {
      ruleId: "no-for-in-loops",
      fileName: "src/cases.ts",
      line: 6,
      column: 3,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-for-in-loops",
      fileName: "src/cases.ts",
      line: 16,
      column: 3,
      message: expectedMessage,
      hint: expectedHint
    }
  ])
})
