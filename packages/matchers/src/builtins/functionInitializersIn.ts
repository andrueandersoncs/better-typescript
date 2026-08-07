import { Array, Iterable, Option, pipe } from "effect"
import * as ts from "typescript"
import { astNodesIn } from "../sources/astNodesIn.js"
import { isFunctionInitializer } from "../support/isFunctionInitializer.js"
import type { FunctionInitializer } from "../support/functionInitializer.js"

const hasFunctionInitializerAncestor = (root: ts.Node, node: ts.Node): boolean => {
  const notRoot = node !== root

  const parentIsFunctionInitializerAncestor = (parent: ts.Node) =>
    isFunctionInitializer(parent) || hasFunctionInitializerAncestor(root, parent)

  return (
    notRoot &&
    pipe(Option.fromNullishOr(node.parent), Option.exists(parentIsFunctionInitializerAncestor))
  )
}

export const functionInitializersIn = (root: ts.Node) => {
  const isTopLevelFunctionInitializer = (fn: FunctionInitializer) =>
    !hasFunctionInitializerAncestor(root, fn)

  return pipe(
    astNodesIn(root),
    Iterable.filter(isFunctionInitializer),
    Iterable.filter(isTopLevelFunctionInitializer),
    Array.fromIterable
  )
}
