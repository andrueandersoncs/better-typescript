import { Function } from "effect"
import type { WorkspaceGuidance } from "./workspaceGuidance.js"
import { asTypedMatch } from "./asTypedMatch.js"

export const widenWorkspaceGuidance =
  <Fact>(guidance: WorkspaceGuidance<Fact>): WorkspaceGuidance<unknown> =>
  (context) =>
    Function.compose(asTypedMatch<Fact>, guidance(context))
