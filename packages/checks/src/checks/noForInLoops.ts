import { pipe, Array } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"
const forInStatementKind = ts.SyntaxKind.ForInStatement

const forInLoopElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ForInStatement): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid imperative logic in for..in loops.",
        hint:
          "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
          "or Record.toEntries(), instead."
      },
      element,
      Array.of
    )

  return matches
}

const forInStatementKinds = Array.of(forInStatementKind)

export const noForInLoops = defineCheck(
  "no-for-in-loops",
  forInStatementKinds,
  ts.isForInStatement,
  forInLoopElements
)
