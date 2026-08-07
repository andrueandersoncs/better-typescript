import { Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"

export const rootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> => {
  const unwrapped = unwrapTransparentExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  const propertyRoot = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.map(Struct.get("expression")),
    Option.flatMap(rootIdentifier)
  )

  const elementRoot = pipe(
    Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
    Option.map(Struct.get("expression")),
    Option.flatMap(rootIdentifier)
  )

  const callRoot = pipe(
    Option.liftPredicate(ts.isCallExpression)(unwrapped),
    Option.map(Struct.get("expression")),
    Option.flatMap(rootIdentifier)
  )

  return pipe(
    identifier,
    Option.orElse(Function.constant(propertyRoot)),
    Option.orElse(Function.constant(elementRoot)),
    Option.orElse(Function.constant(callRoot))
  )
}
