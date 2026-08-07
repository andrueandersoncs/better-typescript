import { Data, Option } from "effect"
import type * as ts from "typescript"
import type { DataStructureDeclaration } from "./dataStructureDeclaration.js"

// DataStructureEntry is one named model plus syntax because concept matchers share identity.
export class DataStructureEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly declaration: DataStructureDeclaration
  readonly documentationNode: ts.Node
  readonly nameNode: ts.Identifier
  readonly name: string
  readonly sourceFile: ts.SourceFile
  readonly exported: boolean
  readonly shape: Option.Option<string>
  readonly fieldSymbols: ReadonlyArray<ts.Symbol>
}> {}
