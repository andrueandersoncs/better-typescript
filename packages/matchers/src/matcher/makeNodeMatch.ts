import type * as ts from "typescript"
import { Match } from "./match.js"
import { NodeTarget } from "./nodeTarget.js"

export const makeNodeMatch = <Fact>(node: ts.Node, fact: Fact) => {
  const target = new NodeTarget({ node })

  return new Match({ target, fact })
}
