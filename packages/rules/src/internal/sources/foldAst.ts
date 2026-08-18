import * as ts from "typescript"
import type { AstFold } from "./astFold.js"
import { astNodesIn } from "./astNodesIn.js"
import { Iterable } from "effect"

export const foldAst =
  <A>(fold: AstFold<A>) =>
  (root: ts.Node) =>
  (initial: A): A => {
    const nodes = astNodesIn(root)

    return Iterable.reduce(nodes, initial, fold)
  }
