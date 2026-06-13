import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noForOfLoops } from "../src/rules/noForOfLoops.js"
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
const fixturePath = path.join(testDirectory, "fixtures", "no-for-of-loops")
const expectedMessage = "Avoid imperative logic in for..of loops."
const expectedHint =
  "Use immutable collection logic such as Array.prototype.map(), " +
  "Array.prototype.reduce(), Array.prototype.filter(), Array.prototype.flatMap(), " +
  "or Streams for async iterables instead."

const matchDetails = (match: RuleMatch): MatchDetails => ({
  ruleId: match.ruleId,
  fileName: match.fileName,
  line: match.line,
  column: match.column,
  message: match.message,
  hint: match.hint
})

const runNoForOfLoopsFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noForOfLoops]))
}

test("no-for-of-loops reports sync and async for-of loops", async () => {
  const matches = await runNoForOfLoopsFixture()

  assert.deepEqual(matches.map(matchDetails), [
    {
      ruleId: "no-for-of-loops",
      fileName: "src/cases.ts",
      line: 6,
      column: 3,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-for-of-loops",
      fileName: "src/cases.ts",
      line: 18,
      column: 3,
      message: expectedMessage,
      hint: expectedHint
    }
  ])
})
