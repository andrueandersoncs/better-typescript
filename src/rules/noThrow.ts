import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const throwStatementKind = ts.SyntaxKind.ThrowStatement

const throwStatementElements = (context: RuleContext) => {
  const element = detection(context)

  const matches = (node: ts.ThrowStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid throwing errors with throw.",
      hint:
        "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
        'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'
    })
  ]

  return matches
}

export const noThrow: RuleCheck = nodeCheck([throwStatementKind])(
  ts.isThrowStatement
)(throwStatementElements)
