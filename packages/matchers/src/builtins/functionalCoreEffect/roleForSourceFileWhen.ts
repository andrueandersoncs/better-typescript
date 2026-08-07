import { Option } from "effect"
import type * as ts from "typescript"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { roleForSourceFile } from "./roleForSourceFile.js"

export const roleForSourceFileWhen =
  (accepts: (role: ArchitectureRole) => boolean) =>
  (index: FunctionalCoreEffectIndex, sourceFile: ts.SourceFile) => {
    const role = roleForSourceFile(index, sourceFile)

    return Option.filter(role, accepts)
  }
