import * as ts from "typescript"
import type { FunctionInitializer } from "./functionInitializer.js"

export const isFunctionInitializer = (node: ts.Node): node is FunctionInitializer =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)
