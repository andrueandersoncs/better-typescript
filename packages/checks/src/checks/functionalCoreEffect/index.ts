import { Array, Data, HashMap, Option, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { ArchitectureRole } from "./data.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"

export class FunctionalCoreEffectIndex extends Data.Class<{
  readonly policy: FunctionalCoreEffectPolicy
  readonly projectRoot: string
  readonly roles: HashMap.HashMap<string, ArchitectureRole>
}> {}

export const buildFunctionalCoreEffectIndex =
  (policy: FunctionalCoreEffectPolicy) =>
  (context: ProgramContext): FunctionalCoreEffectIndex => {
    const relative = toRelativeFileName(context.projectRoot)

    const entries = pipe(
      context.program.getSourceFiles(),
      Array.filter(isProjectSourceFile),
      Array.filterMap((sourceFile) => {
        const relativePath = relative(sourceFile.fileName)

        return pipe(
          policy.roleOf(relativePath),
          Option.map((role) => Tuple.make(sourceFile.fileName, role))
        )
      })
    )

    return new FunctionalCoreEffectIndex({
      policy,
      projectRoot: context.projectRoot,
      roles: HashMap.fromIterable(entries)
    })
  }

export const roleForSourceFile = (
  index: FunctionalCoreEffectIndex,
  sourceFile: ts.SourceFile
): Option.Option<ArchitectureRole> =>
  HashMap.get(index.roles, sourceFile.fileName)
