import { Schema } from "effect"
import { WorkspaceMatcher } from "@better-typescript/matchers/matcher/workspaceMatcher"
import type { WorkspaceGuidance } from "./workspaceGuidance.js"
import { optionalExamples } from "./optionalExamples.js"
import { optionalReported } from "./optionalReported.js"

const workspaceMatcherSchema = Schema.instanceOf(WorkspaceMatcher)

// WorkspacePolicyDefinition is the complete workspace authoring record because defaults land first.
export const WorkspacePolicyDefinition = Schema.Struct({
  name: Schema.String,
  matcher: workspaceMatcherSchema,
  guidance: Schema.Any,
  reported: optionalReported,
  examples: optionalExamples
})

export interface WorkspacePolicyDefinition extends Schema.Schema.Type<
  typeof WorkspacePolicyDefinition
> {}

// WorkspacePolicySeed is the typed workspace authoring input because guidance is specialized.
export type WorkspacePolicySeed<Fact> = Omit<WorkspacePolicyDefinition, "guidance" | "matcher"> & {
  readonly guidance: WorkspaceGuidance<Fact>
  readonly matcher: WorkspaceMatcher<Fact>
}
