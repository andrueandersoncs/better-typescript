import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

const throwStatementKind = ts.SyntaxKind.ThrowStatement

const throwStatementElements = (context: CheckContext) => {
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

export const noThrow: Check = nodeCheck([throwStatementKind])(
  ts.isThrowStatement
)(throwStatementElements)
