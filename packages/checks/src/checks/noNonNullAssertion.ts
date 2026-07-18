import { pipe, Array } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
const nonNullExpressionKind = ts.SyntaxKind.NonNullExpression

const nonNullAssertionElements = (context: CheckContext) => {
  const element = makeDetection(context)

  const matches = (node: ts.NonNullExpression): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid non-null assertions.",
        hint:
          "The ! operator silences the type checker instead of handling the absent case, " +
          "trading a compile-time proof for a runtime crash. Convert the nullable value " +
          "with Option.fromNullishOr and handle both branches (Option.match, " +
          "Option.getOrElse), or narrow it with a type guard the checker verifies."
      },
      element,
      Array.of
    )

  return matches
}

const nonNullExpressionKinds = Array.of(nonNullExpressionKind)

export const noNonNullAssertion = makeCheck(
  "no-non-null-assertion",
  nonNullExpressionKinds,
  ts.isNonNullExpression,
  nonNullAssertionElements
)
