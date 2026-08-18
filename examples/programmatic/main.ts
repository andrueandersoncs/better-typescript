import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { builtinRules } from "@better-typescript/rules/builtinRules"

const projectDirectory = process.argv[2] ?? "."
const project = await Effect.runPromise(loadProject({ projectPath: projectDirectory }))
const violations = lint({ project, rules: builtinRules })

for (const violation of violations) {
  console.log(
    `${violation.filePath}:${violation.line}:${violation.column} ${violation.ruleName} ${violation.message}`
  )
}
