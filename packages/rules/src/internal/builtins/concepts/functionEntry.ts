import { Data, Option } from "effect"
import type * as ts from "typescript"
import type { FunctionDefinition } from "../../support/functionDefinition.js"

// FunctionEntry is one named executable abstraction because ownership and leverage share identity.
export class FunctionEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly scan: Option.Option<FunctionDefinition>
  readonly nameNode: ts.Identifier
  readonly name: string
  readonly sourceFile: ts.SourceFile
  readonly exported: boolean
}> {}
