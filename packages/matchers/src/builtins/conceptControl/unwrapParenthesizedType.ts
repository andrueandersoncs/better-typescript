import * as ts from "typescript"

export const unwrapParenthesizedType = (type: ts.TypeNode): ts.TypeNode =>
  ts.isParenthesizedTypeNode(type) ? unwrapParenthesizedType(type.type) : type
