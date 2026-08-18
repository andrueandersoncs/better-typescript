import type { LoadedWorkspace } from "../project/loadProject/loadProject.js"
import type { Rule } from "./linter.js"

// LintRequest crosses the public lint boundary because callers choose both workspace and rules.
export interface LintRequest {
  readonly project: LoadedWorkspace
  readonly rules: ReadonlyArray<Rule>
}
