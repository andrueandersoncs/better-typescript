import { Array, Function, HashSet, Option, pipe, Result, Schema } from "effect"
import type * as ts from "typescript"
import { fileMatcher, withCompilerOptions } from "../matcher/matcher.js"
import { positionMatch, type MatchContext } from "../matcher/data.js"

// NoUnusedFact is empty payload because guidance and matchers share identity.
export const NoUnusedFact = Schema.Struct({})

export interface NoUnusedFact extends Schema.Schema.Type<typeof NoUnusedFact> {}

// emptyNoUnusedFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoUnusedFact = NoUnusedFact.make({})

const unusedDiagnosticCodes = HashSet.make(6133, 6192, 6196, 6138, 6198, 6199, 6205)

const compilerOptions: ts.CompilerOptions = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true
}

const isUnusedDiagnostic = (diagnostic: ts.Diagnostic) =>
  HashSet.has(unusedDiagnosticCodes, diagnostic.code)

const unusedPositionMatch = (file: ts.SourceFile, start: number) => {
  const position = file.getLineAndCharacterOfPosition(start)

  return positionMatch(file, position.line + 1, position.character + 1, emptyNoUnusedFact)
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
      Option.map(({ file, start }) => unusedPositionMatch(file, start)),
      Result.fromOption(Function.constVoid)
    )
  })
}

const unusedFileMatcher = fileMatcher(unusedMatches)

export const noUnusedMatcher = withCompilerOptions(compilerOptions)(unusedFileMatcher)
