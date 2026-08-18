import { Function } from "effect"
import type * as ts from "typescript"
import { Match } from "./match.js"
import { NodeTarget } from "./nodeTarget.js"

export const makeNodeMatch = Function.untupled(<Fact>([node, fact]: readonly [ts.Node, Fact]) => {
  const target = new NodeTarget({ node })

  return new Match({ target, fact })
})
