import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { flow, Struct, Array, Option } from "effect"

export const isDeclareKeyword = flow(
  Struct.get<ts.ModifierLike, "kind">("kind"),
  strictEqual(ts.SyntaxKind.DeclareKeyword)
)

// Treat ambient decls as external because they mirror a dependency contract, not an author choice.
export const isInAmbientContext = (node: ts.Node): boolean => {
  const sourceFile = node.getSourceFile()

  const modifiers = ts.canHaveModifiers(node)
    ? (ts.getModifiers(node) ?? Array.empty())
    : Array.empty()

  const hasDeclareModifier = Array.some(modifiers, isDeclareKeyword)
  const parent = Option.fromNullishOr<ts.Node>(node.parent)
  const parentIsAmbient = Option.exists(parent, isInAmbientContext)

  const ambientConditions = Array.make(
    sourceFile.isDeclarationFile,
    hasDeclareModifier,
    parentIsAmbient
  )

  return Array.some(ambientConditions, Boolean)
}
