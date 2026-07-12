import { Function, HashMap, HashSet, Schema } from "effect"
import * as ts from "typescript"

export class FunctionEntry extends Schema.Class<FunctionEntry>("FunctionEntry")({
  nameNode: Schema.Any,
  declarationNode: Schema.Any,
  isExported: Schema.Boolean
}) {
  declare readonly nameNode: ts.Identifier
  declare readonly declarationNode:
    | ts.FunctionDeclaration
    | ts.VariableDeclaration
}

export class SymbolClassification extends Schema.Class<SymbolClassification>(
  "SymbolClassification"
)({
  calleeCount: Schema.Number,
  disqualified: Schema.Boolean
}) {}

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


export class ReferenceIndex extends Schema.Class<ReferenceIndex>("ReferenceIndex")({
  entries: Schema.Any,
  calleeOnlySymbols: Schema.Any
}) {
  declare readonly entries: ReadonlyArray<FunctionEntry>
  declare readonly calleeOnlySymbols: HashSet.HashSet<ts.Symbol>
}
