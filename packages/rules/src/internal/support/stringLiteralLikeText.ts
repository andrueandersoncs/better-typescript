import * as ts from "typescript"
import { Option, Struct } from "effect"

export const stringLiteralLikeText = (node: ts.Node) => {
  const literal = Option.liftPredicate(ts.isStringLiteralLike)(node)

  return Option.map(literal, Struct.get("text"))
}
