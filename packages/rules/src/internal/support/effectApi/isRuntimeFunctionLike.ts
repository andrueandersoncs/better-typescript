import { HashSet } from "effect"
import * as ts from "typescript"

const runtimeFunctionLikeKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

export const isRuntimeFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
  HashSet.has(runtimeFunctionLikeKinds, node.kind)
