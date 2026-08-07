import type { WorkspaceMatcher } from "@better-typescript/matchers/matcher/workspaceMatcher"
import { makeWorkspacePolicy } from "@better-typescript/core/engine/policy/makeWorkspacePolicy"
import { type WorkspaceGuidance } from "@better-typescript/core/engine/policy/workspaceGuidance"
import { type WorkspacePolicy } from "@better-typescript/core/engine/policy/workspacePolicyClass"
import { type RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"
import { makePackageExamples } from "./makePackageExamples.js"

export const makeBuiltinWorkspacePolicy = <Fact>(
  name: string,
  matcher: WorkspaceMatcher,
  guidance: WorkspaceGuidance<Fact>
): WorkspacePolicy => {
  const examples = makePackageExamples(name)

  return makeWorkspacePolicy<
    Fact,
    {
      readonly name: string
      readonly matcher: WorkspaceMatcher
      readonly guidance: WorkspaceGuidance<Fact>
      readonly examples: RefactorExampleSource
    }
  >({
    name,
    matcher,
    guidance,
    examples
  })
}
