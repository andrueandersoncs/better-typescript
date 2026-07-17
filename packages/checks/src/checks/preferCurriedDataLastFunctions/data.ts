import { Function, HashMap, Schema } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../support/referenceKey.js"

// SymbolUses is shared uses-map values because its owners need one vocabulary.
export type SymbolUses = HashMap.HashMap<ReferenceKey<ts.Symbol>, SymbolUse>

// SymbolUse is shared use-flag fields because its owners need one vocabulary.
export class SymbolUse extends Schema.Class<SymbolUse>("SymbolUse")({
  hasContextualReference: Schema.Boolean,
  hasDirectCall: Schema.Boolean,
  hasOtherReference: Schema.Boolean
}) {}

export const emptySymbolUse = new SymbolUse({
  hasContextualReference: false,
  hasDirectCall: false,
  hasOtherReference: false
})

export const emptySymbolUses: SymbolUses = HashMap.empty()

export const fallbackEmptySymbolUse: () => SymbolUse = Function.constant(emptySymbolUse)
