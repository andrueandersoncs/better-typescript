import * as assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as path from "node:path"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"

export const assertRuleViolations = async (
  rule: Rule,
  testDirectory: string,
  fixtureName: string,
  expectedFileName = "expected.json"
): Promise<void> => {
  const fixturePath = path.join(testDirectory, "../fixtures", fixtureName)
  const expectedPath = path.join(testDirectory, expectedFileName)
  const expected: unknown = JSON.parse(readFileSync(expectedPath, "utf8"))
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))

  assert.deepEqual(lint({ project, rules: [rule] }), expected)
}
