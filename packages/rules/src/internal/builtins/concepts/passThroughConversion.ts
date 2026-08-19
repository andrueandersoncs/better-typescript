import { Data } from "effect"
import type * as ts from "typescript"
import type { DataStructureEntry } from "./conceptIndex.js"
import type { FunctionEntry } from "./functionEntry.js"

// PassThroughConversion exists because its fields form one stable data contract used by the linter.
export class PassThroughConversion extends Data.Class<{
  readonly source: DataStructureEntry
  readonly target: DataStructureEntry
  readonly functionEntry: FunctionEntry
  readonly node: ts.Node
}> {}
