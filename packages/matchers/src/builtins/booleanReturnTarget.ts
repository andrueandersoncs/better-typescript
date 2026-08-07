import type * as ts from "typescript"

// BooleanReturnTarget is a local syntax union because matchers need one narrowed node shape.
export type BooleanReturnTarget = ts.IfStatement | ts.Block | ts.ConditionalExpression
