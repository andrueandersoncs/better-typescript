import { Array, Data, HashMap, Option, Tuple, pipe, Result, Function } from "effect"
import type * as ts from "typescript"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { ArchitectureRole } from "./data.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"

// FunctionalCoreEffectIndex is shared program snapshot because checks must query one role map.
export class FunctionalCoreEffectIndex extends Data.Class<{
  readonly policy: FunctionalCoreEffectPolicy
  readonly projectRoot: string
  readonly roles: HashMap.HashMap<string, ArchitectureRole>
}> {}

export const buildFunctionalCoreEffectIndex =
  (policy: FunctionalCoreEffectPolicy) => (context: ProgramContext) => {
    const relative = toRelativeFileName(context.projectRoot)
    const sourceFiles = context.program.getSourceFiles()

    const entries = pipe(
      Array.filter(sourceFiles, isProjectSourceFile),
      Array.filterMap((sourceFile) =>
        pipe(
          sourceFile.fileName,
          relative,
          policy.roleOf,
          Option.map((role) => Tuple.make(sourceFile.fileName, role)),
          Result.fromOption(Function.constVoid)
        )
      )
    )

    const roles = HashMap.fromIterable(entries)

    return new FunctionalCoreEffectIndex({
      policy,
      projectRoot: context.projectRoot,
      roles
    })
  }

export const roleForSourceFile = (index: FunctionalCoreEffectIndex, sourceFile: ts.SourceFile) =>
  HashMap.get(index.roles, sourceFile.fileName)
