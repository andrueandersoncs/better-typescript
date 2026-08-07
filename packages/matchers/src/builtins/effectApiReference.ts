import type * as ts from "typescript"

// EffectApiReference is a local syntax union because matchers need one narrowed node shape.
export type EffectApiReference =
  ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression
