import type * as ts from "typescript"
import type { ProgramContext } from "../sources/data.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import type { ArchitectureRoleClassifier } from "./architectureRoleClassifier.js"
import type { ArchitectureRole } from "./architectureRoleType.js"
import { toRelativeFileName } from "./paths.js"
import { HashMap, Tuple, pipe, Option, Result, Function, Array } from "effect"

export const roleMapFromProgram =
  (roleOf: ArchitectureRoleClassifier) =>
  (context: ProgramContext): HashMap.HashMap<string, ArchitectureRole> => {
    const relative = toRelativeFileName(context.projectRoot)
    const sourceFiles = context.program.getSourceFiles()

    const sourceFileRoleEntry = (sourceFile: ts.SourceFile) => {
      const roleEntry = (role: ArchitectureRole) => Tuple.make(sourceFile.fileName, role)

      return pipe(
        sourceFile.fileName,
        relative,
        roleOf,
        Option.map(roleEntry),
        Result.fromOption(Function.constVoid)
      )
    }

    const entries = pipe(
      Array.filter(sourceFiles, isProjectSourceFile),
      Array.filterMap(sourceFileRoleEntry)
    )

    return HashMap.fromIterable(entries)
  }
