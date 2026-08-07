import * as ts from "typescript"
import { pipe, Option, Struct } from "effect"

export const hasAssignmentOperator = (expression: ts.BinaryExpression) =>
  expression.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
  expression.operatorToken.kind <= ts.SyntaxKind.LastAssignment

export const binaryAssignmentTarget = (expression: ts.BinaryExpression) =>
  pipe(Option.liftPredicate(hasAssignmentOperator)(expression), Option.map(Struct.get("left")))
