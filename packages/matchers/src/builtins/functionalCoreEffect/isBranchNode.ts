import { Array } from "effect"
import * as ts from "typescript"

export const isBranchNode = (node: ts.Node) => {
  const isIf = ts.isIfStatement(node)
  const isSwitch = ts.isSwitchStatement(node)
  const isConditional = ts.isConditionalExpression(node)
  const checks = Array.make(isIf, isSwitch, isConditional)

  return Array.some(checks, Boolean)
}
