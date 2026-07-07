import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const tryStatementKind = ts.SyntaxKind.TryStatement

const tryCatchElements = (context: RuleContext) => {
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

export const noTryCatch: RuleCheck = nodeCheck([tryStatementKind])(
  ts.isTryStatement
)(tryCatchElements)
