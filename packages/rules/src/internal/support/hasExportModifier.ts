import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { flow, Struct, Array } from "effect"

export const isExportKeyword = flow(
  Struct.get<ts.Modifier, "kind">("kind"),
  strictEqual(ts.SyntaxKind.ExportKeyword)
)

export const hasExportModifier = (statement: ts.Statement) => {
  const modifiers = ts.canHaveModifiers(statement)
    ? (ts.getModifiers(statement) ?? Array.empty())
    : Array.empty()

  return Array.some(modifiers, isExportKeyword)
}
