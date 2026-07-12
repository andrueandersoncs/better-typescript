import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

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
