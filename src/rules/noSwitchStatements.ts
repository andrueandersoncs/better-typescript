import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const switchStatementKind = ts.SyntaxKind.SwitchStatement

const switchStatementElements = (context: RuleContext) => {
  const element = detection(context)

  const matches = (node: ts.SwitchStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid switch statements.",
      hint:
        "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
        "so every case is handled explicitly."
    })
  ]

  return matches
}

export const noSwitchStatements: RuleCheck = nodeCheck([switchStatementKind])(
  ts.isSwitchStatement
)(switchStatementElements)
