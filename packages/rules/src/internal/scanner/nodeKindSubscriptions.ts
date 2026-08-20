import { Array } from "effect"
import * as ts from "typescript"

export const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

export const effectQualityRuntimeKinds = Array.make(
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.DeleteExpression,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.ForStatement
)

export const effectQualityStructureKinds = Array.make(
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.TypeAssertionExpression,
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.FunctionDeclaration
)

export const propertyAccessKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

export const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

export const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

export const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

export const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)
