import { Function, Match, pipe } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"

export const booleanLiteralValue = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return pipe(
    Match.value(unwrapped.kind),
    Match.when(ts.SyntaxKind.TrueKeyword, Function.constTrue),
    Match.when(ts.SyntaxKind.FalseKeyword, Function.constFalse),
    Match.option
  )
}
