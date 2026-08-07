import { Array, Option, pipe } from "effect"
import * as ts from "typescript"

export const effectServiceMakerObject = (
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
  if (!ts.isCallExpression(expression)) {
    return Option.none()
  }

  const makerArgument = Array.get(expression.arguments, 1)
  const maker = pipe(makerArgument, Option.filter(ts.isObjectLiteralExpression))

  return Option.isSome(maker) ? maker : effectServiceMakerObject(expression.expression)
}
