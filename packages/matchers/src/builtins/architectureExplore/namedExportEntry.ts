import { Option, pipe } from "effect"
import * as ts from "typescript"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"
import { ExportedSymbolEntry } from "./exportedSymbolEntry.js"
import { ExportedSymbolKind } from "./exportedSymbolKind.js"

export const namedExportEntry =
  (checker: ts.TypeChecker) => (nameNode: ts.Identifier, kind: ExportedSymbolKind) => {
    const makeExportedSymbolEntry = (symbol: ts.Symbol) =>
      new ExportedSymbolEntry({
        symbol,
        nameNode,
        kind
      })

    return pipe(resolvedSymbolAt(checker)(nameNode), Option.map(makeExportedSymbolEntry))
  }
