import * as ts from "typescript"
import type { FunctionDefinition } from "./functionDefinition.js"
import { Array } from "effect"

export const isFunctionDefinition = (node: ts.Node): node is FunctionDefinition => {
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isFunctionExpression = ts.isFunctionExpression(node)
  const isArrowFunction = ts.isArrowFunction(node)
  const isMethodDeclaration = ts.isMethodDeclaration(node)

  const conditions = Array.make(
    isFunctionDeclaration,
    isFunctionExpression,
    isArrowFunction,
    isMethodDeclaration
  )

  return Array.some(conditions, Boolean)
}
