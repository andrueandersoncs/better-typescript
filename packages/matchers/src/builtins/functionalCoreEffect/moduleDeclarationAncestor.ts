import { Option, pipe } from "effect"
import * as ts from "typescript"

export const moduleDeclarationAncestor = (
  node: ts.Node
): Option.Option<ts.ImportDeclaration | ts.ExportDeclaration> => {
  const isModuleDeclaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)

  return isModuleDeclaration
    ? Option.some(node)
    : pipe(Option.fromNullishOr(node.parent), Option.flatMap(moduleDeclarationAncestor))
}
