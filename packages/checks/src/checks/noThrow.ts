import { pipe, Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const throwStatementKind = ts.SyntaxKind.ThrowStatement

const throwStatementElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ThrowStatement): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid throwing errors with throw.",
        hint:
          "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
          'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'
      },
      element,
      Array.of
    )

  return matches
}

const throwStatementKinds = Array.of(throwStatementKind)

export const noThrow: Check = nodeCheck(throwStatementKinds)(
  ts.isThrowStatement
)(throwStatementElements)

export const noThrowExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-throw")
