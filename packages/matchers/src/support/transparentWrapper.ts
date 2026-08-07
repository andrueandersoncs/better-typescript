import * as ts from "typescript"
import { transparentWrapperKinds } from "./transparentWrapperKinds.js"
import { HashSet } from "effect"

// TransparentWrapper is shared unwrap syntax because paren/satisfies/assert share one walk.
export type TransparentWrapper =
  ts.ParenthesizedExpression | ts.SatisfiesExpression | ts.AsExpression

export const unwrapTransparentExpression = (expression: ts.Expression): ts.Expression =>
  HashSet.has(transparentWrapperKinds, expression.kind)
    ? unwrapTransparentExpression((expression as TransparentWrapper).expression)
    : expression
