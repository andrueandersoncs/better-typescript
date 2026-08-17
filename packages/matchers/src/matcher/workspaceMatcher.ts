import { Match } from "./match.js"
import { WorkspaceContext } from "./workspaceContext.js"
import { Data } from "effect"

// WorkspaceMatcher runs after collection because program matchers lack path grouping.
export class WorkspaceMatcher<Fact = unknown> extends Data.Class<{
  readonly match: (context: WorkspaceContext) => ReadonlyArray<Match<Fact>>
}> {}
