import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
const forInStatementKind = ts.SyntaxKind.ForInStatement

const forInLoopElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ForInStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid imperative logic in for..in loops.",
      hint:
        "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
        "or Record.toEntries(), instead."
    })
  ]

  return matches
}

export const noForInLoops: Check = nodeCheck([forInStatementKind])(
  ts.isForInStatement
)(forInLoopElements)

export const noForInLoopsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-for-in-loops")
