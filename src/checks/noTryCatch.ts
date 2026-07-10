import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

const tryStatementKind = ts.SyntaxKind.TryStatement

const tryCatchElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.TryStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid try/catch for error handling.",
      hint:
        "Model effectful code that can fail as an Effect and declare its failures as explicit " +
        'Schema.TaggedError classes, for example: class FetchError extends Schema.TaggedError<FetchError>("FetchError")("FetchError", {}) {}. ' +
        "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catchAll) instead of catching inside a try block."
    })
  ]

  return matches
}

export const noTryCatch: Check = nodeCheck([tryStatementKind])(
  ts.isTryStatement
)(tryCatchElements)
