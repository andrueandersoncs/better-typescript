import type * as ts from "typescript"

// MutationNode is a local syntax union because matchers need one narrowed node shape.
export type MutationNode =
  ts.BinaryExpression | ts.PrefixUnaryExpression | ts.PostfixUnaryExpression | ts.DeleteExpression
