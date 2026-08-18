import { Array, Function, HashSet, Option, Result, Schema, pipe } from "effect"
import type * as ts from "typescript"
import { fileScanner } from "../scanner/fileScanner.js"
import { makePositionMatch } from "../scanner/makePositionMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { Scanner } from "../scanner/scannerData.js"

// NoUnusedFact exists because its fields form one stable data contract used by the linter.
export const NoUnusedFact = Schema.Struct({})

export interface NoUnusedFact extends Schema.Schema.Type<typeof NoUnusedFact> {}

// emptyNoUnusedFact exists because its fields form one stable data contract used by the linter.
export const emptyNoUnusedFact = NoUnusedFact.make({})

const withCompilerOptions =
  (compilerOptions: ts.CompilerOptions) =>
  (scanner: Scanner): Scanner =>
    new Scanner({
      plan: scanner.plan,
      compilerOptions: { ...scanner.compilerOptions, ...compilerOptions }
    })

const unusedDiagnosticCodes = HashSet.make(6133, 6192, 6196, 6138, 6198, 6199, 6205)

const compilerOptions: ts.CompilerOptions = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true
}

const isUnusedDiagnostic = (diagnostic: ts.Diagnostic) =>
  HashSet.has(unusedDiagnosticCodes, diagnostic.code)

const makeUnusedPositionMatch = (file: ts.SourceFile) => (start: number) => {
  const position = file.getLineAndCharacterOfPosition(start)

  return makePositionMatch(emptyNoUnusedFact)(position.line + 1)(position.character + 1)(file)
}

const unusedMatches = (context: MatchContext) => {
  const diagnostics = context.program.getSemanticDiagnostics(context.sourceFile)
  const unusedDiagnostics = Array.filter(diagnostics, isUnusedDiagnostic)

  return Array.filterMap(unusedDiagnostics, (diagnostic) => {
    const fileOption = Option.fromNullishOr(diagnostic.file)
    const startOption = Option.fromNullishOr(diagnostic.start)

    return pipe(
      Option.all({
        file: fileOption,
        start: startOption
      }),
      Option.map(({ file, start }) => makeUnusedPositionMatch(file)(start)),
      Result.fromOption(Function.constVoid)
    )
  })
}

const unusedFileScanner = fileScanner(unusedMatches)

export const noUnusedScanner = withCompilerOptions(compilerOptions)(unusedFileScanner)
