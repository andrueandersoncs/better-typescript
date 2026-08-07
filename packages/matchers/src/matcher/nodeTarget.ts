import type * as ts from "typescript"
import { Data } from "effect"

// NodeTarget pins a fact to one AST node because node-local policies cannot use file spans alone.
export class NodeTarget extends Data.TaggedClass("NodeTarget")<{
  readonly node: ts.Node
}> {}
