import * as path from "node:path"
import { Effect } from "effect"
import type * as ts from "typescript"
import { lint } from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"
import type { Violation } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { fixturesRoot } from "./ruleTestFixturesRoot.js"

export const runRuleFixture = async (
  rule: Rule,
  compilerOptions: ts.CompilerOptions = {}
): Promise<ReadonlyArray<Violation>> => {
  const fixturePath = path.join(fixturesRoot, rule.name)
  const project = await Effect.runPromise(
    loadProject({ projectPath: fixturePath, compilerOptions })
  )

  return lint({ project, rules: [rule] })
}
