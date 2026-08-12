import * as ts from "typescript"

export const isNonEmptyObjectLiteral = (node: ts.Node): node is ts.ObjectLiteralExpression =>
  ts.isObjectLiteralExpression(node) && node.properties.length > 0
