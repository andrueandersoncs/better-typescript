import { Data } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../../support/referenceKeyType.js"

// FieldRead records an independently observed field access because construction is not consumption.
export class FieldRead extends Data.Class<{
  readonly field: ReferenceKey<ts.Symbol>
  readonly node: ts.Node
}> {}
