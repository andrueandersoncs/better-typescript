import { Option } from "effect"
import * as ts from "typescript"
import { isRuntimeFunctionLike } from "./isRuntimeFunctionLike.js"

const runtimeFunctionLikeFrom = (parent: ts.Node) =>
  isRuntimeFunctionLike(parent) ? Option.some(parent) : enclosingFunctionLike(parent)

export const enclosingFunctionLike = (node: ts.Node): Option.Option<ts.FunctionLikeDeclaration> => {
  const parent = Option.fromNullishOr(node.parent)

  return Option.flatMap(parent, runtimeFunctionLikeFrom)
}
