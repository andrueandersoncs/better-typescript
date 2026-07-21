import { Option, Struct, pipe } from "effect"
import * as ts from "typescript"

export const stringLiteralLikeText = (node: ts.Node) => {
  const literal = Option.liftPredicate(ts.isStringLiteralLike)(node)

  return Option.map(literal, Struct.get("text"))
}

export const optionalStringLiteralLikeText = (node: Option.Option<ts.Node>) =>
  pipe(node, Option.flatMap(stringLiteralLikeText))
