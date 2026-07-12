import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

const forStatementKind = ts.SyntaxKind.ForStatement

const forLoopElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ForStatement): ReadonlyArray<Detection> => {
    const hasStopCondition = pipe(
      Option.fromNullable(node.condition),
      Option.isSome
    )
    const hasInitializer = pipe(
      Option.fromNullable(node.initializer),
      Option.isSome
    )
    const hasIncrementor = pipe(
      Option.fromNullable(node.incrementor),
      Option.isSome
    )
    const hasIterator = [hasInitializer, hasIncrementor].some(Boolean)
    const isIteratorForLoop = [hasStopCondition, hasIterator].every(Boolean)

    return isIteratorForLoop
      ? [
          element({
            node,
            message: "Avoid imperative logic in iterator-based for loops.",
            hint:
              "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
              "Array.filter(), or Array.flatMap(), instead."
          })
        ]
      : []
  }

  return matches
}

export const noForLoops: Check = nodeCheck([forStatementKind])(
  ts.isForStatement
)(forLoopElements)
