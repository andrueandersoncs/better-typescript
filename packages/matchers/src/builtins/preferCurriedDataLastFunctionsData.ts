import { Function, HashMap, Schema } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../support/referenceKey.js"

// SymbolUses is shared uses-map values because its owners need one vocabulary.
export type SymbolUses = HashMap.HashMap<ReferenceKey<ts.Symbol>, SymbolUse>

// SymbolUse is shared use-flag fields because its owners need one vocabulary.
export const SymbolUse = Schema.Struct({
  hasContextualReference: Schema.Boolean,
  hasDirectCall: Schema.Boolean,
  hasOtherReference: Schema.Boolean
})

export interface SymbolUse extends Schema.Schema.Type<typeof SymbolUse> {}

// emptySymbolUse is the zero-use seed because callers need one shared default record.
export const emptySymbolUse = SymbolUse.make({
  hasContextualReference: false,
  hasDirectCall: false,
  hasOtherReference: false
})

export const emptySymbolUses: SymbolUses = HashMap.empty()

export const fallbackEmptySymbolUse: () => SymbolUse = Function.constant(emptySymbolUse)
