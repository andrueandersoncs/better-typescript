import { pipe, Array } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
const throwStatementKind = ts.SyntaxKind.ThrowStatement

const throwStatementElements = (context: CheckContext) => {
  const element = makeDetection(context)

  const matches = (node: ts.ThrowStatement): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid throwing errors with throw.",
        hint:
          "Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: " +
          'class CustomError extends Schema.TaggedErrorClass<CustomError>()("CustomError", {}) {}; yield* new CustomError().'
      },
      element,
      Array.of
    )

  return matches
}

const throwStatementKinds = Array.of(throwStatementKind)

export const noThrow = makeCheck(
  "no-throw",
  throwStatementKinds,
  ts.isThrowStatement,
  throwStatementElements
)
