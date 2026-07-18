import { Data, HashMap } from "effect"
import type * as ts from "typescript"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { ArchitectureRole } from "../support/architectureRole.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import { roleForFile, roleMapFromProgram } from "../support/roleMap.js"

// FunctionalCoreEffectIndex is shared program snapshot because checks must query one role map.
export class FunctionalCoreEffectIndex extends Data.Class<{
  readonly policy: FunctionalCoreEffectPolicy
  readonly projectRoot: string
  readonly roles: HashMap.HashMap<string, ArchitectureRole>
}> {}

export const buildFunctionalCoreEffectIndex =
  (policy: FunctionalCoreEffectPolicy) => (context: ProgramContext) => {
    const roles = roleMapFromProgram(policy.roleOf)(context)

    return new FunctionalCoreEffectIndex({
      policy,
      projectRoot: context.projectRoot,
      roles
    })
  }

export const roleForSourceFile = (index: FunctionalCoreEffectIndex, sourceFile: ts.SourceFile) =>
  roleForFile(index.roles)(sourceFile)
