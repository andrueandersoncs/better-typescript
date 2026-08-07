import { Match } from "./match.js"
import { WorkspaceContext } from "./workspaceContext.js"
import { WorkspaceMatcher } from "./workspaceMatcher.js"
import { Array } from "effect"

export const runWorkspaceMatchers =
  (matchers: ReadonlyArray<WorkspaceMatcher>) =>
  (context: WorkspaceContext): ReadonlyArray<ReadonlyArray<Match<unknown>>> =>
    Array.map(matchers, (matcher) => matcher.match(context))
