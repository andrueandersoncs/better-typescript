import type * as ts from "typescript"
import { Data } from "effect"

// PositionTarget pins a fact to a line and column because diagnostics lack a stable node handle.
export class PositionTarget extends Data.TaggedClass("PositionTarget")<{
  readonly sourceFile: ts.SourceFile
  readonly line: number
  readonly column: number
}> {}
