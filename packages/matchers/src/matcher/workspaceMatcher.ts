import { Match } from "./match.js"
import { WorkspaceContext } from "./workspaceContext.js"
import { Data } from "effect"

// WorkspaceMatcher runs after collection because program matchers lack path grouping.
export class WorkspaceMatcher extends Data.Class<{
  readonly match: (context: WorkspaceContext) => ReadonlyArray<Match<unknown>>
}> {}
