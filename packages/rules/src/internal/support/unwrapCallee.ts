import * as ts from "typescript"
import { Option, Function } from "effect"

export const unwrapCallee = (expression: ts.Expression): ts.Expression => {
  const call = Option.liftPredicate(ts.isCallExpression)(expression)

  return Option.match(call, {
    onNone: Function.constant(expression),
    onSome: (node) => unwrapCallee(node.expression)
  })
}
