import type * as ts from "typescript"

export const acceptsNode = (_node: ts.Node): _node is ts.Node => true
