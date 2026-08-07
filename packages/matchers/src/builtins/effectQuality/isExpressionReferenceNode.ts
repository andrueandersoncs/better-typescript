import * as ts from "typescript"

export const isExpressionReferenceNode = (candidate: ts.Node): candidate is ts.Expression => {
  const asIdentifier = ts.isIdentifier(candidate)
  const asProperty = ts.isPropertyAccessExpression(candidate)

  return asIdentifier || asProperty
}
