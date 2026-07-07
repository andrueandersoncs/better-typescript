import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const forOfStatementKind = ts.SyntaxKind.ForOfStatement

const forOfLoopElements = (context: RuleContext) => {
  const element = detection(context)

  const matches = (node: ts.ForOfStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid imperative logic in for..of loops.",
      hint:
        "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
        "Array.filter(), or Array.flatMap(), instead."
    })
  ]

  return matches
}

export const noForOfLoops: RuleCheck = nodeCheck([forOfStatementKind])(
  ts.isForOfStatement
)(forOfLoopElements)
