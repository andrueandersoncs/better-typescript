import * as ts from "typescript"
import type { CallLikeExpression } from "./callLikeExpression.js"

export const isCallLikeExpression = (node: ts.Node): node is CallLikeExpression =>
  ts.isCallExpression(node) || ts.isNewExpression(node)
