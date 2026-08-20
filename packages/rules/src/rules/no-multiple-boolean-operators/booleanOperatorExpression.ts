import type * as ts from "typescript"

// BooleanOperatorExpression is a local syntax union because scanners need one narrowed node shape.
export type BooleanOperatorExpression =
  ts.BinaryExpression | ts.PrefixUnaryExpression | ts.ConditionalExpression
