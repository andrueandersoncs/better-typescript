import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noDuplicateFunctionNames } from "../src/rules/noDuplicateFunctionNames.js"
import { runRules } from "../src/runner/runRules.js"

const workspace = await Effect.runPromise(
  loadProject("tests/fixtures/no-duplicate-function-names")
)
const matches = workspace.projects.flatMap((project) =>
  runRules([noDuplicateFunctionNames])(project)
)
for (const match of matches) {
  console.log(
    `${match.fileName}:${match.line}:${match.column} ${match.message}`
  )
}
