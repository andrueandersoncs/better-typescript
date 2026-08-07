import * as ts from "typescript"
import type { ResultCardinality } from "./resultCardinality.js"
import type { ResultExecution } from "./resultExecution.js"
import type { ResultShape } from "./resultShape.js"
import type { ResultTotality } from "./resultTotality.js"
import { Data } from "effect"

// CallableResultSemantics shares one result model because every naming policy consumes it.
export class CallableResultSemantics extends Data.Class<{
  readonly returnType: ts.Type
  readonly words: ReadonlyArray<string>
  readonly shape: ResultShape
  readonly cardinality: ResultCardinality
  readonly totality: ResultTotality
  readonly execution: ResultExecution
}> {}
