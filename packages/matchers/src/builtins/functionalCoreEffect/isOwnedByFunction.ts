import { Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type * as ts from "typescript"
import { enclosingFunctionLike } from "./enclosingFunctionLike.js"

export const isOwnedByFunction = (node: ts.Node, owner: ts.FunctionLikeDeclaration) => {
  const declarationIsOwner = strictEqual(owner)

  return pipe(enclosingFunctionLike(node), Option.exists(declarationIsOwner))
}
