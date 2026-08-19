import { Function } from "effect"
import { NodeTarget } from "@better-typescript/core/linter"
import type * as ts from "typescript"
import { Match } from "./match.js"

export const makeNodeMatch = Function.untupled(<Fact>([node, fact]: readonly [ts.Node, Fact]) => {
  const target = NodeTarget.make({ node })

  return new Match({ target, fact })
})
