import { Array, Function, HashMap, Option, Result, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { isProjectSourceFile } from "../sources/sources.js"
import type { ProgramContext } from "../sources/data.js"
import type { ArchitectureRole, ArchitectureRoleClassifier } from "./architectureRole.js"
import { toRelativeFileName } from "./paths.js"

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

export const roleForFile =
  (roles: HashMap.HashMap<string, ArchitectureRole>) => (sourceFile: ts.SourceFile) =>
    HashMap.get(roles, sourceFile.fileName)
