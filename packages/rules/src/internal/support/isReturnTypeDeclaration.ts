import * as ts from "typescript"
import type { ReturnTypeDeclaration } from "./returnTypeDeclaration.js"
import { Array } from "effect"

export const isReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration => {
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isFunctionExpression = ts.isFunctionExpression(node)
  const isArrowFunction = ts.isArrowFunction(node)
  const isMethodDeclaration = ts.isMethodDeclaration(node)
  const isMethodSignature = ts.isMethodSignature(node)
  const isCallSignatureDeclaration = ts.isCallSignatureDeclaration(node)
  const isFunctionTypeNode = ts.isFunctionTypeNode(node)
  const isGetAccessorDeclaration = ts.isGetAccessorDeclaration(node)

  const conditions = Array.make(
    isFunctionDeclaration,
    isFunctionExpression,
    isArrowFunction,
    isMethodDeclaration,
    isMethodSignature,
    isCallSignatureDeclaration,
    isFunctionTypeNode,
    isGetAccessorDeclaration
  )

  return Array.some(conditions, Boolean)
}
