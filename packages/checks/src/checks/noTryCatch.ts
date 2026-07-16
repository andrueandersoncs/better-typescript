import { pipe, Array } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"
const tryStatementKind = ts.SyntaxKind.TryStatement

const tryCatchElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.TryStatement): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid try/catch for error handling.",
        hint:
          "Model effectful code that can fail as an Effect and declare its failures as explicit " +
          'Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}. ' +
          "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block."
      },
      element,
      Array.of
    )

  return matches
}

const tryStatementKinds = Array.of(tryStatementKind)

export const noTryCatch = defineCheck(
  "no-try-catch",
  tryStatementKinds,
  ts.isTryStatement,
  tryCatchElements
)
