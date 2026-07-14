import { Function, HashMap, HashSet, Schema } from "effect"
import * as ts from "typescript"

/**
 * FunctionEntry is the shared nameNode, declarationNode, isExported contract used by
 * statementEntries, ReferenceIndex, and sourceFileEntries.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class FunctionEntry extends Schema.Class<FunctionEntry>("FunctionEntry")(
  {
    nameNode: Schema.Any,
    declarationNode: Schema.Any,
    isExported: Schema.Boolean
  }
) {
  declare readonly nameNode: ts.Identifier
  declare readonly declarationNode:
    ts.FunctionDeclaration | ts.VariableDeclaration
}

/**
 * SymbolClassification is the shared calleeCount, disqualified contract used by
 * Classifications, emptyClassification, and buildReferenceIndex.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class SymbolClassification extends Schema.Class<SymbolClassification>(
  "SymbolClassification"
)({
  calleeCount: Schema.Number,
  disqualified: Schema.Boolean
}) {}

/**
 * Classifications is the shared Classifications values contract used by
 * buildReferenceIndex and emptyClassifications.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export type Classifications = HashMap.HashMap<ts.Symbol, SymbolClassification>

export const emptyClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: false
})

export const emptyClassifications: Classifications = HashMap.empty()

export const fallbackEmptyClassification: () => SymbolClassification =
  Function.constant(emptyClassification)

export const disqualifiedClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: true
})

/**
 * ReferenceIndex is the shared entries, calleeOnlySymbols contract used by
 * singleUseCalleeListeners and buildReferenceIndex.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class ReferenceIndex extends Schema.Class<ReferenceIndex>(
  "ReferenceIndex"
)({
  entries: Schema.Any,
  calleeOnlySymbols: Schema.Any
}) {
  declare readonly entries: ReadonlyArray<FunctionEntry>
  declare readonly calleeOnlySymbols: HashSet.HashSet<ts.Symbol>
}
