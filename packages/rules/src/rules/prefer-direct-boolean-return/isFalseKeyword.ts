import { Struct, flow } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"
import { strictEqual } from "../../internal/equivalence.js"

export const isFalseKeyword = flow(
  unwrapExpression,
  Struct.get<ts.Expression, "kind">("kind"),
  strictEqual(ts.SyntaxKind.FalseKeyword)
)
