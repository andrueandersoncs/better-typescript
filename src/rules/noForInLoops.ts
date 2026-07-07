import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const forInStatementKind = ts.SyntaxKind.ForInStatement

const forInLoopElements = (context: RuleContext) => {
  const element = detection(context)

  const matches = (node: ts.ForInStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid imperative logic in for..in loops.",
      hint:
        "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
        "or Record.toEntries(), instead."
    })
  ]

  return matches
}

export const noForInLoops: RuleCheck = nodeCheck([forInStatementKind])(
  ts.isForInStatement
)(forInLoopElements)
