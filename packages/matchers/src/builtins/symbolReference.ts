import { Data } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../support/referenceKeyType.js"

// SymbolReference joins stable identity to compiler access because recursion needs both views.
export class SymbolReference extends Data.Class<{
  readonly key: ReferenceKey
  readonly symbol: ts.Symbol
}> {}
