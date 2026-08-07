import * as ts from "typescript"
import { astChildren } from "./astChildren.js"
import { Array, Tuple, pipe, Option, Iterable } from "effect"

// Explicit stack traversal is required because TypeScript trees can exceed the JS call stack.
export const astNodesIn = (root: ts.Node) => {
  const initial: ReadonlyArray<ts.Node> = Array.of(root)

  const unfoldPending = (pending: ReadonlyArray<ts.Node>) => {
    const advanceFromHead = (node: ts.Node) => {
      const children = astChildren(node)
      const rest = Array.drop(pending, 1)
      const next: ReadonlyArray<ts.Node> = Array.appendAll(children, rest)

      return Tuple.make(node, next)
    }

    return pipe(Array.head(pending), Option.map(advanceFromHead))
  }

  return Iterable.unfold(initial, unfoldPending)
}
