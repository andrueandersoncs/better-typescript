import * as ts from "typescript"

export const symbolDeclarations = (symbol: ts.Symbol) => symbol.getDeclarations()
