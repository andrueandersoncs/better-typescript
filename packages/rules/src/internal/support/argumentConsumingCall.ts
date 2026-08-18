import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { callArguments } from "./callArguments.js"
import type { CallLikeExpression } from "./callLikeExpression.js"
import { isCallLikeExpression } from "./isCallLikeExpression.js"
import { HashSet, Option, Array } from "effect"

export const argumentForwardingKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ArrayLiteralExpression
)

export const argumentConsumingCall = (node: ts.Node): Option.Option<CallLikeExpression> => {
  if (isCallLikeExpression(node.parent)) {
    const args = callArguments(node.parent)
    const isArgument = Array.some(args, strictEqual(node))

    return isArgument ? Option.some(node.parent) : Option.none()
  }

  const isForwarding = HashSet.has(argumentForwardingKinds, node.parent.kind)

  return isForwarding ? argumentConsumingCall(node.parent) : Option.none()
}
