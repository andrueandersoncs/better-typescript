import { Function, HashMap, Schema } from "effect"
import * as ts from "typescript"

/**
 * FunctionEntry is the shared nameNode, declarationNode, isExported, isPureLooking
 * contract used by listeners, buildIndex, and sourceFileEntries.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class FunctionEntry extends Schema.Class<FunctionEntry>(
  "SingleUsePureExportFunctionEntry"
)({
  nameNode: Schema.Any,
  declarationNode: Schema.Any,
  isExported: Schema.Boolean,
  isPureLooking: Schema.Boolean
}) {
  declare readonly nameNode: ts.Identifier

  declare readonly declarationNode:
    ts.FunctionDeclaration | ts.VariableDeclaration
}

/**
 * SymbolClassification is the shared calleeCount, disqualified, callerFile contract
 * used by isSingleUseClassification, buildIndex, and emptyClassification.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class SymbolClassification extends Schema.Class<SymbolClassification>(
  "SingleUsePureExportSymbolClassification"
)({
  calleeCount: Schema.Number,
  disqualified: Schema.Boolean,
  callerFile: Schema.String
}) {}

/**
 * Classifications is the shared Classifications values contract used by buildIndex,
 * PureExportIndex, and emptyClassifications.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export type Classifications = HashMap.HashMap<ts.Symbol, SymbolClassification>

export const emptyClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: false,
  callerFile: ""
})

export const emptyClassifications: Classifications = HashMap.empty()

export const fallbackEmptyClassification: () => SymbolClassification =
  Function.constant(emptyClassification)

/**
 * PureExportIndex is the shared entries, classifications, projectRoot contract used by
 * listeners and buildIndex.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class PureExportIndex extends Schema.Class<PureExportIndex>(
  "SingleUsePureExportIndex"
)({
  entries: Schema.Any,
  classifications: Schema.Any,
  projectRoot: Schema.String
}) {
  declare readonly entries: ReadonlyArray<FunctionEntry>
  declare readonly classifications: Classifications
}
