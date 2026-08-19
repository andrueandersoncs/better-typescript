import { Schema } from "effect"
import { LoadedWorkspace } from "../project/loadProject/loadProject.js"
import { Rule } from "./linter.js"

const Rules = Schema.Array(Rule)

// LintRequest crosses the public lint seam because callers choose a workspace and Rules.
export const LintRequest = Schema.Struct({
  project: LoadedWorkspace,
  rules: Rules
})

export interface LintRequest extends Schema.Schema.Type<typeof LintRequest> {}
