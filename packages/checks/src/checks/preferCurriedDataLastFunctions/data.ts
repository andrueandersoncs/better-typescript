import { Function, HashMap, Schema } from "effect"
import type * as ts from "typescript"

/**
 * SymbolUses is the shared SymbolUses values contract used by buildSymbolUses,
 * curriedDataLastListeners, and updateSymbolUse.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export type SymbolUses = HashMap.HashMap<ts.Symbol, SymbolUse>

/**
 * SymbolUse is the shared hasContextualReference, hasDirectCall,
 * hasOtherReference contract used by isContextualOnlyUse, emptySymbolUse, and
 * fallbackEmptySymbolUse.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
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
