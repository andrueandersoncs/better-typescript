import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
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
