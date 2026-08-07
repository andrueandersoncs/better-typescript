import { Option, pipe } from "effect"
import type * as ts from "typescript"
import { strictEqual } from "../equivalence.js"

export const nodeOwnsChild =
  <Parent extends ts.Node>(
    isParent: (node: ts.Node) => node is Parent,
    childOf: (parent: Parent) => ts.Node
  ) =>
  (parent: ts.Node, current: ts.Node): boolean =>
    pipe(
      Option.liftPredicate(isParent)(parent),
      Option.map(childOf),
      Option.exists(strictEqual(current))
    )
