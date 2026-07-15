import { Array, pipe, Option } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"
const forStatementKind = ts.SyntaxKind.ForStatement

const forLoopElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ForStatement): ReadonlyArray<Detection> => {
    const hasStopCondition = pipe(Option.fromNullable(node.condition), Option.isSome)

    const hasInitializer = pipe(Option.fromNullable(node.initializer), Option.isSome)

    const hasIncrementor = pipe(Option.fromNullable(node.incrementor), Option.isSome)

    const iteratorParts = Array.make(hasInitializer, hasIncrementor)
    const hasIterator = Array.some(iteratorParts, Boolean)

    const iteratorForLoopConditions = Array.make(hasStopCondition, hasIterator)
    const isIteratorForLoop = Array.every(iteratorForLoopConditions, Boolean)

    const forLoopMatch = element({
      node,
      message: "Avoid imperative logic in iterator-based for loops.",
      hint:
        "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
        "Array.filter(), or Array.flatMap(), instead."
    })

    return isIteratorForLoop ? Array.of(forLoopMatch) : Array.empty()
  }

  return matches
}

const forStatementKinds = Array.of(forStatementKind)

export const noForLoops: Check = nodeCheck(forStatementKinds)(ts.isForStatement)(forLoopElements)

export const noForLoopsExamples: NonEmptyRefactorExamples = fixtureRefactorExamples("no-for-loops")
