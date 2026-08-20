import { Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"

export const stringLiteralExpression = (expression: ts.Expression) =>
  pipe(unwrapExpression(expression), Option.liftPredicate(ts.isStringLiteralLike))
