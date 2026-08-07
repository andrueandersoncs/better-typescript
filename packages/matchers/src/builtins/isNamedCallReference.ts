import { Struct } from "effect"
import * as ts from "typescript"
import { nodeOwnsChild } from "../support/nodeOwnsChild.js"

const callExpression = Struct.get<ts.CallExpression, "expression">("expression")
const callExpressionOwnsChild = nodeOwnsChild(ts.isCallExpression, callExpression)

export const isNamedCallReference = (node: ts.Identifier) =>
  callExpressionOwnsChild(node.parent, node)
