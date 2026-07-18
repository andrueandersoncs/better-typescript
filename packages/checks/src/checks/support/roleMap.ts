import { Array, Function, HashMap, Option, Result, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { ArchitectureRole, ArchitectureRoleClassifier } from "./architectureRole.js"

export const roleMapFromProgram =
  (roleOf: ArchitectureRoleClassifier) =>
  (context: ProgramContext): HashMap.HashMap<string, ArchitectureRole> => {
    const relative = toRelativeFileName(context.projectRoot)
    const sourceFiles = context.program.getSourceFiles()

    const entries = pipe(
      Array.filter(sourceFiles, isProjectSourceFile),
      Array.filterMap((sourceFile) =>
        pipe(
          sourceFile.fileName,
          relative,
          roleOf,
          Option.map((role) => Tuple.make(sourceFile.fileName, role)),
          Result.fromOption(Function.constVoid)
        )
      )
    )

    return HashMap.fromIterable(entries)
  }

export const roleForFile =
  (roles: HashMap.HashMap<string, ArchitectureRole>) => (sourceFile: ts.SourceFile) =>
    HashMap.get(roles, sourceFile.fileName)
