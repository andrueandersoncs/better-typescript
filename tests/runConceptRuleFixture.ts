import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { ruleNamed } from "./ruleNamed.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "concept-rules")
const conceptRules = [
  "closed-abstraction",
  "duplicate-shape",
  "function-derived-model",
  "missing-rationale",
  "parameter-bag",
  "pass-through-conversion",
  "redundant-alias",
  "speculative-export",
  "unused-field"
].map(ruleNamed)

export const runFixture = async () => {
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))

  return lint({ project, rules: conceptRules })
}
