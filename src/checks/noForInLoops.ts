import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

const forInStatementKind = ts.SyntaxKind.ForInStatement

const forInLoopElements = (context: CheckContext) => {
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

export const noForInLoops: Check = nodeCheck([forInStatementKind])(
  ts.isForInStatement
)(forInLoopElements)
