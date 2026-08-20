import { Array, Function, HashSet, Option, Result, Schema, pipe } from "effect"
import type * as ts from "typescript"
import { makeFileScanner } from "../../internal/scanner/makeFileScanner.js"
import { makePositionMatch } from "../../internal/scanner/makePositionMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"

// NoUnusedFact exists because its fields form one stable data contract used by the linter.
export const NoUnusedFact = Schema.Struct({})

export interface NoUnusedFact extends Schema.Schema.Type<typeof NoUnusedFact> {}

// emptyNoUnusedFact exists because its fields form one stable data contract used by the linter.
export const emptyNoUnusedFact = NoUnusedFact.make({})

const unusedDiagnosticCodes = HashSet.make(6133, 6192, 6196, 6138, 6198, 6199, 6205)

const isUnusedDiagnostic = (diagnostic: ts.Diagnostic) =>
  HashSet.has(unusedDiagnosticCodes, diagnostic.code)

const makeNoUnusedPositionMatch = Function.flip(makePositionMatch(emptyNoUnusedFact))

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
      Option.map(({ file, start }) => makeNoUnusedPositionMatch(file)(start)),
      Result.fromOption(Function.constVoid)
    )
  })
}

export const noUnusedScanner = makeFileScanner(unusedMatches)
