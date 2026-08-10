import { Data } from "effect"
import type * as ts from "typescript"
import type { DataStructureEntry } from "./conceptControlEngine.js"
import type { FunctionEntry } from "./functionEntry.js"

// PassThroughConversion is conversion evidence because parallel models are ok.
export class PassThroughConversion extends Data.Class<{
  readonly source: DataStructureEntry
  readonly target: DataStructureEntry
  readonly functionEntry: FunctionEntry
  readonly node: ts.Node
}> {}
