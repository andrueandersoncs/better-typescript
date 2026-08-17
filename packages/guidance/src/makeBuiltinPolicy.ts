import { Equivalence } from "effect"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeWorkspacePolicy } from "@better-typescript/core/engine/policy/makeWorkspacePolicy"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import type { PolicySeed } from "@better-typescript/core/engine/policy/policySeed"
import type { WorkspacePolicy } from "@better-typescript/core/engine/policy/workspacePolicyClass"
import type { WorkspacePolicySeed } from "@better-typescript/core/engine/policy/workspacePolicyDefinition"
import { makePackageExamples } from "./makePackageExamples.js"

const builtinPolicyStageEquivalence = Equivalence.strictEqual<"program" | "workspace">()

const isWorkspaceBuiltinPolicyDefinition = <Fact>(
  definition:
    | (PolicySeed<Fact> & Readonly<Record<"reported", boolean> & Record<"stage", "program">>)
    | (WorkspacePolicySeed<Fact> &
        Readonly<Record<"reported", boolean> & Record<"stage", "workspace">>)
): definition is WorkspacePolicySeed<Fact> &
  Readonly<Record<"reported", boolean> & Record<"stage", "workspace">> =>
  builtinPolicyStageEquivalence(definition.stage, "workspace")

export function makeBuiltinPolicy<Fact>(
  definition: PolicySeed<Fact> & Readonly<Record<"reported", boolean> & Record<"stage", "program">>
): Policy

export function makeBuiltinPolicy<Fact>(
  definition: WorkspacePolicySeed<Fact> &
    Readonly<Record<"reported", boolean> & Record<"stage", "workspace">>
): WorkspacePolicy

export function makeBuiltinPolicy<Fact>(
  definition:
    | (PolicySeed<Fact> & Readonly<Record<"reported", boolean> & Record<"stage", "program">>)
    | (WorkspacePolicySeed<Fact> &
        Readonly<Record<"reported", boolean> & Record<"stage", "workspace">>)
): Policy | WorkspacePolicy {
  const examples = makePackageExamples(definition.name)

  if (isWorkspaceBuiltinPolicyDefinition(definition)) {
    return makeWorkspacePolicy<Fact>({
      name: definition.name,
      matcher: definition.matcher,
      guidance: definition.guidance,
      reported: definition.reported,
      examples
    })
  }

  return makePolicy<Fact>({
    name: definition.name,
    matcher: definition.matcher,
    guidance: definition.guidance,
    reported: definition.reported,
    examples
  })
}
