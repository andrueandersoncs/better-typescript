import type { Match } from "@better-typescript/matchers/matcher/match"
import type { WorkspaceContext } from "@better-typescript/matchers/matcher/workspaceContext"
import type { FindingSource } from "./findingSource.js"

export type WorkspaceGuidance<Fact> = (
  context: WorkspaceContext
) => (match: Match<Fact>) => ReadonlyArray<FindingSource>
