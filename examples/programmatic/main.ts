import { Effect } from "effect"
import { runAnalysis } from "@better-typescript/core/analysis"
import { builtinRules } from "@better-typescript/rules/builtinRules"

const projectDirectory = process.argv[2] ?? "."
const analysis = await Effect.runPromise(
  runAnalysis({ projectPath: projectDirectory, rules: builtinRules })
)

for (const violation of analysis.violations) {
  console.log(
    `${violation.filePath}:${violation.line}:${violation.column} ${violation.ruleName} ${violation.message}`
  )
}
