import { Function, HashMap, Schema } from "effect"
import * as ts from "typescript"

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

export class SymbolClassification extends Schema.Class<SymbolClassification>(
  "SingleUsePureExportSymbolClassification"
)({
  calleeCount: Schema.Number,
  disqualified: Schema.Boolean,
  callerFile: Schema.String
}) {}

export type Classifications = HashMap.HashMap<ts.Symbol, SymbolClassification>

export const emptyClassification = new SymbolClassification({
  calleeCount: 0,
  disqualified: false,
  callerFile: ""
})

export const emptyClassifications: Classifications = HashMap.empty()

export const fallbackEmptyClassification: () => SymbolClassification =
  Function.constant(emptyClassification)

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
