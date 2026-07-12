import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

const forOfStatementKind = ts.SyntaxKind.ForOfStatement

const forOfLoopElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ForOfStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid imperative logic in for..of loops.",
      hint:
        "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
        "Array.filter(), or Array.flatMap(), instead."
    })
  ]

  return matches
}

export const noForOfLoops: Check = nodeCheck([forOfStatementKind])(
  ts.isForOfStatement
)(forOfLoopElements)

export const noForOfLoopsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-for-of-loops")
