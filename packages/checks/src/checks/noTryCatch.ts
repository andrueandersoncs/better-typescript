import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
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

export const noTryCatchExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-try-catch")
