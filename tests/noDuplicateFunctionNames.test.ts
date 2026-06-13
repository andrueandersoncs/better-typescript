import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noDuplicateFunctionNames } from "../src/rules/noDuplicateFunctionNames.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"

interface DuplicateFunctionMatchDetails {
  readonly ruleId: string
  readonly fileName: string
  readonly line: number
  readonly column: number
  readonly message: string
  readonly hint: string
}

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-duplicate-function-names")

const messageFor = (functionName: string): string =>
  `Avoid declaring the top-level function ${functionName} in multiple files.`

const hintFor = (functionName: string, otherFiles: string): string =>
  `${functionName} is also declared in ${otherFiles}. Extract one shared implementation ` +
  "into a module scoped to its domain and import it from every file that uses it. Name " +
  "the module after the concept it serves (ts.Node helpers belong in ts-node.ts), not a " +
  "generic lib.ts or utils.ts."

const duplicateFunctionMatchDetails = (
  match: RuleMatch
): DuplicateFunctionMatchDetails => ({
  ruleId: match.ruleId,
  fileName: match.fileName,
  line: match.line,
  column: match.column,
  message: match.message,
  hint: match.hint
})

const compareDuplicateFunctionMatchDetails = (
  left: DuplicateFunctionMatchDetails,
  right: DuplicateFunctionMatchDetails
): number =>
  left.fileName.localeCompare(right.fileName) ||
  left.line - right.line ||
  left.column - right.column

const sortedDuplicateFunctionMatchDetails = (
  matches: ReadonlyArray<RuleMatch>
): ReadonlyArray<DuplicateFunctionMatchDetails> => {
  const details = matches.map(duplicateFunctionMatchDetails)

  return details.sort(compareDuplicateFunctionMatchDetails)
}

const sortedExpectedMatchDetails = (
  matches: ReadonlyArray<DuplicateFunctionMatchDetails>
): ReadonlyArray<DuplicateFunctionMatchDetails> => {
  const details = [...matches]

  return details.sort(compareDuplicateFunctionMatchDetails)
}

const runNoDuplicateFunctionNamesFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noDuplicateFunctionNames]))
}

test("no-duplicate-function-names reports duplicate top-level declarations", async () => {
  const matches = await runNoDuplicateFunctionNamesFixture()
  const details = sortedDuplicateFunctionMatchDetails(matches)
  const expectedDetails = sortedExpectedMatchDetails([
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/alpha.ts",
      line: 3,
      column: 10,
      message: messageFor("sharedDeclaration"),
      hint: hintFor("sharedDeclaration", "src/beta.ts")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/alpha.ts",
      line: 5,
      column: 7,
      message: messageFor("sharedArrow"),
      hint: hintFor("sharedArrow", "src/beta.ts")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/alpha.ts",
      line: 7,
      column: 7,
      message: messageFor("sharedExpression"),
      hint: hintFor("sharedExpression", "src/gamma.ts")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/alpha.ts",
      line: 9,
      column: 7,
      message: messageFor("crowded"),
      hint: hintFor("crowded", "src/beta.ts, src/gamma.ts, src/delta.ts and 1 more file")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/beta.ts",
      line: 3,
      column: 10,
      message: messageFor("sharedDeclaration"),
      hint: hintFor("sharedDeclaration", "src/alpha.ts")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/beta.ts",
      line: 5,
      column: 7,
      message: messageFor("sharedArrow"),
      hint: hintFor("sharedArrow", "src/alpha.ts")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/beta.ts",
      line: 7,
      column: 7,
      message: messageFor("crowded"),
      hint: hintFor("crowded", "src/alpha.ts, src/gamma.ts, src/delta.ts and 1 more file")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/gamma.ts",
      line: 3,
      column: 7,
      message: messageFor("sharedExpression"),
      hint: hintFor("sharedExpression", "src/alpha.ts")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/gamma.ts",
      line: 5,
      column: 7,
      message: messageFor("crowded"),
      hint: hintFor("crowded", "src/alpha.ts, src/beta.ts, src/delta.ts and 1 more file")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/delta.ts",
      line: 3,
      column: 10,
      message: messageFor("crowded"),
      hint: hintFor("crowded", "src/alpha.ts, src/beta.ts, src/gamma.ts and 1 more file")
    },
    {
      ruleId: "no-duplicate-function-names",
      fileName: "src/epsilon.ts",
      line: 3,
      column: 7,
      message: messageFor("crowded"),
      hint: hintFor("crowded", "src/alpha.ts, src/beta.ts, src/gamma.ts and 1 more file")
    }
  ])

  assert.deepEqual(details, expectedDetails)
})
