import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { fileSubscriptions } from "@better-typescript/core/engine/check"
import { withProgramIndex } from "@better-typescript/core/engine/sources"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { Detection, Location } from "@better-typescript/core/engine/location/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const message = "Avoid unused imports, declarations, and parameters."

const hint =
  "Delete the unused import, variable, function, type, or parameter. " +
  "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

const unusedDiagnosticCodes = HashSet.make(6133, 6192, 6196, 6138, 6198, 6199, 6205)

const isUnusedDiagnostic = (diagnostic: ts.Diagnostic): boolean =>
  HashSet.has(unusedDiagnosticCodes, diagnostic.code)

const buildUnusedProgram = (context: ProgramContext): ts.Program => {
  const rootNames = context.program.getRootFileNames()
  const compilerOptions = context.program.getCompilerOptions()
  const options: ts.CompilerOptions = { ...compilerOptions }
  options.noUnusedLocals = true
  options.noUnusedParameters = true
  options.noEmit = true

  return ts.createProgram({
    rootNames,
    options,
    oldProgram: context.program
  })
}

const unusedListeners = (unusedProgram: ts.Program): ReadonlyArray<Subscription> => {
  const matches = (context: CheckContext): ReadonlyArray<Detection> => {
    const sourceFileName = context.sourceFile.fileName
    const unusedSourceFile = unusedProgram.getSourceFile(sourceFileName)
    const toRelative = toRelativeFileName(context.projectRoot)

    return pipe(
      Option.fromNullable(unusedSourceFile),
      Option.map((sourceFile) => {
        const diagnostics = unusedProgram.getSemanticDiagnostics(sourceFile)
        const unusedDiagnostics = Array.filter(diagnostics, isUnusedDiagnostic)

        return Array.filterMap(unusedDiagnostics, (diagnostic) => {
          const fileOption = Option.fromNullable(diagnostic.file)
          const startOption = Option.fromNullable(diagnostic.start)

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
            })
          )
        })
      }),
      Option.getOrElse(Array.empty)
    )
  }

  return fileSubscriptions(matches)
}

export const noUnused: Check = withProgramIndex(buildUnusedProgram)(unusedListeners)

export const noUnusedExamples: NonEmptyRefactorExamples = fixtureRefactorExamples("no-unused")
