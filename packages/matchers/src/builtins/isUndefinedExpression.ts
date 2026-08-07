import { Option, Struct, flow } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { strictEqual } from "../equivalence.js"

const isUndefinedIdentifier = flow(
  Struct.get<ts.Identifier, "text">("text"),
  strictEqual("undefined")
)

export const isUndefinedExpression = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  return Option.exists(identifier, isUndefinedIdentifier)
}
