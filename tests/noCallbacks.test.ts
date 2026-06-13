import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noCallbacks } from "../src/rules/noCallbacks.js"
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
const fixturePath = path.join(testDirectory, "fixtures", "no-callbacks")
const expectedMessage =
  "Avoid callback-style functions that accept a function argument and return void."
const expectedHint =
  "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
  "own API as an Effect-returning function from the start."

const matchDetails = (match: RuleMatch): MatchDetails => ({
  ruleId: match.ruleId,
  fileName: match.fileName,
  line: match.line,
  column: match.column,
  message: match.message,
  hint: match.hint
})

const runNoCallbacksFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noCallbacks]))
}

test("no-callbacks reports callback-style declarations from real fixtures", async () => {
  const matches = await runNoCallbacksFixture()

  assert.deepEqual(matches.map(matchDetails), [
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 3,
      column: 1,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 7,
      column: 28,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 11,
      column: 23,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 16,
      column: 3,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 22,
      column: 3,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 26,
      column: 3,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 29,
      column: 26,
      message: expectedMessage,
      hint: expectedHint
    },
    {
      ruleId: "no-callbacks",
      fileName: "src/cases.ts",
      line: 32,
      column: 26,
      message: expectedMessage,
      hint: expectedHint
    }
  ])
})
