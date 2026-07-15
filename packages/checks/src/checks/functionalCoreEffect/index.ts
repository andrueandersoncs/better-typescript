import { Array, Data, HashMap, Option, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { ArchitectureRole } from "./data.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"

/**
 * FunctionalCoreEffectIndex is the shared program snapshot for functional-core
 * checks.
 *
 * @remarks
 *   It remains explicit because boundary and shape detectors must query one role
 *   map and policy pair. Removing it would rebuild path roles per check and
 *   risk inconsistent classification.
 * @modelRole shared
 */
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
      Array.filterMap((sourceFile) =>
        pipe(
          sourceFile.fileName,
          relative,
          policy.roleOf,
          Option.map((role) => Tuple.make(sourceFile.fileName, role))
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

export const roleForSourceFile = (
  index: FunctionalCoreEffectIndex,
  sourceFile: ts.SourceFile
): Option.Option<ArchitectureRole> => HashMap.get(index.roles, sourceFile.fileName)
