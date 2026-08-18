import * as ts from "typescript"
import { Array, Function, Option, Struct, flow, pipe } from "effect"
import { astNodesIn } from "./astNodesIn.js"

const syntaxKindKey = flow(Struct.get<ts.Node, "kind">("kind"), String)
const groupNodesByKind = Array.groupBy(syntaxKindKey)
const groupedAstNodes = Function.memoize(flow(astNodesIn, groupNodesByKind))
const emptyAstNodes = () => Array.empty<ts.Node>()

export const astNodesForKindsIn =
  (root: ts.Node) =>
  (kinds: ReadonlyArray<ts.SyntaxKind>): ReadonlyArray<ts.Node> => {
    const nodeGroups = groupedAstNodes(root)

    const nodesForKind = (kind: ts.SyntaxKind) => {
      const key = String(kind)

      return pipe(nodeGroups[key], Option.fromNullishOr, Option.getOrElse(emptyAstNodes))
    }

    return Array.flatMap(kinds, nodesForKind)
  }
