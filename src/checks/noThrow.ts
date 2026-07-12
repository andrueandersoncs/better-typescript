import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

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

export const noThrowExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-throw")
