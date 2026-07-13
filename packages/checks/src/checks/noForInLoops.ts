import { pipe, Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
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

export const noForInLoops: Check = nodeCheck(forInStatementKinds)(
  ts.isForInStatement
)(forInLoopElements)

export const noForInLoopsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-for-in-loops")
