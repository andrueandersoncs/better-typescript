import * as ts from "typescript"
import { HashSet } from "effect"

export const transparentWrapperKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.AsExpression
)
