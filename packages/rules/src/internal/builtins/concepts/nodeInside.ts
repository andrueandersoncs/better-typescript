import type * as ts from "typescript"

export const nodeInside = (node: ts.Node) => (candidate: ts.Node) =>
  node.pos >= candidate.pos && node.end <= candidate.end
