import { Data } from "effect"
import type * as ts from "typescript"

// FunctionDefinition is shared name/reportNode contract because owners need one vocabulary.
export class FunctionDefinition extends Data.Class<{
  readonly name: string
  readonly reportNode: ts.Node
}> {}

// DataStructureModule is shared model identity because resolution and reporting need one shape.
export class DataStructureModule extends Data.Class<{
  readonly name: string
  readonly moduleDirectory: string
}> {}
