import { Data } from "effect"
import type * as ts from "typescript"
import { ExportedSymbolKind } from "./exportedSymbolKind.js"

// Generalized exports are shared because exportSurface inventories non-functions.
export class ExportedSymbolEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly nameNode: ts.Identifier
  readonly kind: ExportedSymbolKind
}> {}
