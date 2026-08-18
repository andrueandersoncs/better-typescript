import * as ts from "typescript"
import { Array, Function, Iterable, Option, Tuple, pipe } from "effect"
import { astChildren } from "./astChildren.js"

const collectAstNodes = (root: ts.Node) => {
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

  return pipe(Iterable.unfold(initial, unfoldPending), Array.fromIterable)
}

// Memoization reuses one traversal because every independently owned rule reads the same syntax tree.
export const astNodesIn = Function.memoize(collectAstNodes)
