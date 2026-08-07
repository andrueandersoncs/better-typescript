import { Option, pipe } from "effect"
import * as ts from "typescript"

export const importDeclarationAncestor = (node: ts.Node): Option.Option<ts.ImportDeclaration> =>
  ts.isImportDeclaration(node)
    ? Option.some(node)
    : pipe(Option.fromNullishOr(node.parent), Option.flatMap(importDeclarationAncestor))
