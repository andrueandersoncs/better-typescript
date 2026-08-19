import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { ruleNamed } from "./ruleNamed.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "concept-rules")
export const conceptRuleNames = [
  "closed-abstraction",
  "duplicate-shape",
  "function-derived-model",
  "missing-rationale",
  "parameter-bag",
  "pass-through-conversion",
  "redundant-alias",
  "speculative-export",
  "unused-field"
] as const

const conceptRules = conceptRuleNames.map(ruleNamed)

const loadFixtureProject = () => Effect.runPromise(loadProject({ projectPath: fixturePath }))

export const runFixture = async () => {
  const project = await loadFixtureProject()

  return lint({ project, rules: conceptRules })
}

export const runConceptRulesIndependently = async () => {
  const project = await loadFixtureProject()

  return conceptRules.map((rule) => ({ rule, violations: lint({ project, rules: [rule] }) }))
}
