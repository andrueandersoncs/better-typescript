import { Data, Option } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import type { DataStructureEntry } from "./conceptControlEngine.js"

// FieldRead attributes a field access to its owner because construction is not consumption.
export class FieldRead extends Data.Class<{
  readonly model: DataStructureEntry
  readonly field: ReferenceKey<ts.Symbol>
  readonly owner: Option.Option<ts.Symbol>
  readonly node: ts.Node
}> {}
