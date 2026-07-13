import { Data } from "effect"
import type * as ts from "typescript"

export class SourceComment extends Data.Class<{
  readonly kind: ts.SyntaxKind
  readonly pos: number
  readonly end: number
}> {}
