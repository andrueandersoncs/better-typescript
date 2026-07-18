import { Data, HashMap } from "effect"
import type * as ts from "typescript"
import type { Subscription } from "@better-typescript/core/engine/check/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { withProgramIndex } from "../../defineCheck.js"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { roleForFile, roleMapFromProgram } from "../support/roleMap.js"
import type { EffectQualityPolicy } from "./policy.js"

// EffectQualityIndex is shared program snapshot because checks must query one role map.
export class EffectQualityIndex extends Data.Class<{
  readonly policy: EffectQualityPolicy
  readonly projectRoot: string
  readonly roles: HashMap.HashMap<string, ArchitectureRole>
}> {}

export const buildEffectQualityIndex =
  (policy: EffectQualityPolicy) => (context: ProgramContext) => {
    const roles = roleMapFromProgram(policy.roleOf)(context)

    return new EffectQualityIndex({
      policy,
      projectRoot: context.projectRoot,
      roles
    })
  }

export const withEffectQualityIndex =
  (subscriptions: (index: EffectQualityIndex) => ReadonlyArray<Subscription>) =>
  (policy: EffectQualityPolicy) =>
    withProgramIndex(buildEffectQualityIndex(policy))(subscriptions)

export const roleForSourceFile = (index: EffectQualityIndex, sourceFile: ts.SourceFile) =>
  roleForFile(index.roles)(sourceFile)
