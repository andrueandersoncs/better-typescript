import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { Array, Option } from "effect"

export const containsUndefinedKeyword = (node: ts.Node): boolean => {
  const isUndefinedKeyword = strictEqual(ts.SyntaxKind.UndefinedKeyword)(node.kind)
  const childResult = ts.forEachChild(node, containsUndefinedKeyword)
  const childContainsUndefinedKeyword = strictEqual(true)(childResult)
  const conditions = Array.make(isUndefinedKeyword, childContainsUndefinedKeyword)

  return Array.some(conditions, Boolean)
}

export const containsUndefinedType = (typeNode: Option.Option<ts.TypeNode>) =>
  Option.exists(typeNode, containsUndefinedKeyword)
