import * as ts from "typescript"

export const isBlockOrSourceFile = (node: ts.Node): node is ts.Block | ts.SourceFile =>
  ts.isBlock(node) || ts.isSourceFile(node)
