import { HashSet } from "effect"
import * as ts from "typescript"

export const functionLikeKinds = HashSet.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

export const isFunctionLike = (node: ts.Node) => HashSet.has(functionLikeKinds, node.kind)
