import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

const switchStatementKind = ts.SyntaxKind.SwitchStatement

const switchStatementElements = (context: CheckContext) => {
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

export const noSwitchStatements: Check = nodeCheck([switchStatementKind])(
  ts.isSwitchStatement
)(switchStatementElements)
