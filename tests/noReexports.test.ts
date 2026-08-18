import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "bun:test"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { ruleNamed } from "./ruleNamed.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-reexports")

const runFixture = async () => {
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))

  return lint({ project, rules: [ruleNamed("no-reexports")] })
}

test("no-reexports prohibits every imported binding export form", async () => {
  const violations = await runFixture()
  const reexportLines = violations
    .filter((violation) => violation.filePath === "src/reexports.ts")
    .map((violation) => violation.line)

  assert.deepEqual(reexportLines, [4, 5, 6, 7, 8, 9, 10])

  const defaultReexport = violations.find(
    (violation) => violation.filePath === "src/defaultReexport.ts"
  )

  assert.equal(defaultReexport?.line, 3)
})
