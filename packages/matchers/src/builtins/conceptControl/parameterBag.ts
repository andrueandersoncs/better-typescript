import { Data } from "effect"
import type * as ts from "typescript"
import type { DataStructureEntry } from "./conceptControlEngine.js"
import type { FunctionEntry } from "./functionEntry.js"

// ParameterBag is a model built only to cross one call seam because raw counts are ambiguous.
export class ParameterBag extends Data.Class<{
  readonly model: DataStructureEntry
  readonly functionEntry: FunctionEntry
  readonly node: ts.Node
}> {}
