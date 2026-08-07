import { Data } from "effect"
import type * as ts from "typescript"

// ExportedFunctionEntry binds a symbol to nodes because matchers share identity.
export class ExportedFunctionEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly nameNode: ts.Identifier
  readonly declarationNode: ts.Declaration
  readonly functionNode: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
}> {}
