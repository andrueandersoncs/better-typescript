import { Option } from "effect"
import { WorkspacePolicy } from "./workspacePolicyClass.js"
import type { WorkspacePolicySeed } from "./workspacePolicyDefinition.js"
import { examplesFromDefinition } from "../example/examplesFromDefinition.js"
import { reportedFromDefinition } from "./reportedFromDefinition.js"
import { widenWorkspaceGuidance } from "./widenWorkspaceGuidance.js"

export const makeWorkspacePolicy = <
  Fact,
  Seed extends WorkspacePolicySeed<Fact> = WorkspacePolicySeed<Fact>
>(
  definition: Seed
): WorkspacePolicy => {
  const reported = reportedFromDefinition(definition)
  const maybeExamples = Option.fromNullishOr(definition.examples)
  const examples = examplesFromDefinition(maybeExamples)

  return new WorkspacePolicy({
    name: definition.name,
    matcher: definition.matcher,
    guidance: widenWorkspaceGuidance(definition.guidance),
    reported,
    examples
  })
}
