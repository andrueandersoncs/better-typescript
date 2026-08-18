import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { isExternalArgumentPosition } from "./isExternalArgumentPosition.js"
import { Array, Option, pipe } from "effect"
import { rawSymbolAt } from "./rawSymbolAt.js"

export const nameNodeEscapes =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (nameNode: ts.Node): boolean => {
    const symbolAtNode = rawSymbolAt(checker)

    return pipe(
      symbolAtNode(nameNode),
      Option.exists((symbol) => {
        const candidateMatches = (candidate: ts.Node): boolean => {
          const isEscapingReference = pipe(
            Option.liftPredicate(ts.isIdentifier)(candidate),
            Option.exists((identifier) => {
              const isDeclarationName = strictEqual(nameNode)(identifier)
              const nodeSymbol = symbolAtNode(identifier)
              const isSameSymbol = strictEqual(symbol)
              const refersToSymbol = Option.exists(nodeSymbol, isSameSymbol)
              const isExternalArgument = isExternalArgumentPosition(checker)(identifier)

              const escapeConditions = Array.make(
                !isDeclarationName,
                refersToSymbol,
                isExternalArgument
              )

              return Array.every(escapeConditions, Boolean)
            })
          )

          const childMatch = ts.forEachChild(candidate, candidateMatches)
          const matched = isEscapingReference ? true : childMatch

          return strictEqual(true)(matched)
        }

        return candidateMatches(sourceFile)
      })
    )
  }
