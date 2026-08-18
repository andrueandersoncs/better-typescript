import * as ts from "typescript"

export const isAccessExpression = (
  node: ts.Node
): node is ts.PropertyAccessExpression | ts.ElementAccessExpression =>
  ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
