import { Array, HashSet, Option, pipe, Result, Function } from "effect"
import type * as ts from "typescript"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { Detection, Location } from "@better-typescript/core/engine/location/data"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { defineFileCheck } from "../defineCheck.js"

const message = "Avoid unused imports, declarations, and parameters."

const hint =
  "Delete the unused import, variable, function, type, or parameter. " +
  "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

const unusedDiagnosticCodes = HashSet.make(6133, 6192, 6196, 6138, 6198, 6199, 6205)

const compilerOptions: ts.CompilerOptions = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true
}

const isUnusedDiagnostic = (diagnostic: ts.Diagnostic): boolean =>
  HashSet.has(unusedDiagnosticCodes, diagnostic.code)

const unusedMatches = (context: CheckContext): ReadonlyArray<Detection> => {
  const diagnostics = context.program.getSemanticDiagnostics(context.sourceFile)
  const unusedDiagnostics = Array.filter(diagnostics, isUnusedDiagnostic)
  const toRelative = toRelativeFileName(context.projectRoot)

  return Array.filterMap(unusedDiagnostics, (diagnostic) => {
    const fileOption = Option.fromNullishOr(diagnostic.file)
    const startOption = Option.fromNullishOr(diagnostic.start)

    return pipe(
      Option.all({
        file: fileOption,
        start: startOption
      }),
      Option.map(({ file, start }) => {
        const position = file.getLineAndCharacterOfPosition(start)
        const path = toRelative(file.fileName)

        const location = new Location({
          path,
          line: position.line + 1,
          column: position.character + 1
        })

        return new Detection({
          location,
          message,
          hint
        })
      }),
      Result.fromOption(Function.constVoid)
    )
  })
}

export const noUnused = defineFileCheck("no-unused", unusedMatches, compilerOptions)
