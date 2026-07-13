import { pipe, Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const forOfStatementKind = ts.SyntaxKind.ForOfStatement

const forOfLoopElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ForOfStatement): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid imperative logic in for..of loops.",
        hint:
          "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
          "Array.filter(), or Array.flatMap(), instead."
      },
      element,
      Array.of
    )

  return matches
}

const forOfStatementKinds = Array.of(forOfStatementKind)

export const noForOfLoops: Check = nodeCheck(forOfStatementKinds)(
  ts.isForOfStatement
)(forOfLoopElements)

export const noForOfLoopsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-for-of-loops")
