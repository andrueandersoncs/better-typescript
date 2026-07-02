import { Array, MutableList, MutableRef } from "effect"
import * as ts from "typescript"

// forEachChild callback must not return truthy or traversal stops early; false satisfies this without void or undefined.
const recordChild =
  (children: MutableList.MutableList<ts.Node>) =>
  (child: ts.Node): false => {
    MutableList.append(children, child)

    return false
  }

// ts.forEachChild is callback-only, so accumulation needs a mutable seam; MutableList keeps it bounded and local. Prefer foldAst for whole-tree walks: it allocates nothing per node.
export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = MutableList.empty<ts.Node>()

  ts.forEachChild(node, recordChild(children))

  return Array.fromIterable(children)
}

export type AstFold<A> = (accumulator: A, node: ts.Node) => A

// ts.forEachChild cannot thread a fold's accumulator through its callback return value, so one MutableRef per walk carries it; the callback returns false so traversal never stops early. Visits root first, then descendants in document order.
export const foldAst =
  <A>(fold: AstFold<A>) =>
  (root: ts.Node) =>
  (initial: A): A => {
    const accumulator = MutableRef.make(initial)
    const visit = (node: ts.Node): false => {
      const current = MutableRef.get(accumulator)
      const folded = fold(current, node)
      MutableRef.set(accumulator, folded)
      ts.forEachChild(node, visit)

      return false
    }
    visit(root)

    return MutableRef.get(accumulator)
  }
