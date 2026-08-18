import * as ts from "typescript"
import { transparentWrapperKinds } from "./transparentWrapperKinds.js"
import { HashSet, Option, Function } from "effect"

export const outermostTransparentWrapper = (expression: ts.Expression): ts.Expression => {
  const parentIsTransparent = HashSet.has(transparentWrapperKinds, expression.parent.kind)

  if (!parentIsTransparent) {
    return expression
  }

  const parentExpression = Option.liftPredicate(ts.isExpression)(expression.parent)

  return Option.match(parentExpression, {
    onNone: Function.constant(expression),
    onSome: outermostTransparentWrapper
  })
}
