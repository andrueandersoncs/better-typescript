import * as ts from "typescript"

export const isFunctionLikeExpression = (
  initializer: ts.Expression
): initializer is ts.ArrowFunction | ts.FunctionExpression => {
  const asArrow = ts.isArrowFunction(initializer)
  const asFunction = ts.isFunctionExpression(initializer)

  return asArrow || asFunction
}
