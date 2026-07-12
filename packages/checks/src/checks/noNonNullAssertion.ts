import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const nonNullExpressionKind = ts.SyntaxKind.NonNullExpression

const nonNullAssertionElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.NonNullExpression): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid non-null assertions.",
      hint:
        "The ! operator silences the type checker instead of handling the absent case, " +
        "trading a compile-time proof for a runtime crash. Convert the nullable value " +
        "with Option.fromNullable and handle both branches (Option.match, " +
        "Option.getOrElse), or narrow it with a type guard the checker verifies."
    })
  ]

  return matches
}

export const noNonNullAssertion: Check = nodeCheck([nonNullExpressionKind])(
  ts.isNonNullExpression
)(nonNullAssertionElements)

export const noNonNullAssertionExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-non-null-assertion")
