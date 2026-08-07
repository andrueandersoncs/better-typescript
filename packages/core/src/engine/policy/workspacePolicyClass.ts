import { Data } from "effect"
import type { WorkspaceMatcher } from "@better-typescript/matchers/matcher/workspaceMatcher"
import type { RefactorExampleSource } from "../example/refactorExampleSource.js"
import type { WorkspaceGuidance } from "./workspaceGuidance.js"

// WorkspacePolicy is distinct because workspace matching runs after all programs.
export class WorkspacePolicy extends Data.Class<{
  readonly name: string
  readonly matcher: WorkspaceMatcher
  readonly guidance: WorkspaceGuidance<unknown>
  readonly reported: boolean
  readonly examples: RefactorExampleSource
}> {}
