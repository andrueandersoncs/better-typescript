import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"
const forOfStatementKind = ts.SyntaxKind.ForOfStatement

const synchronousHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

const asynchronousHint =
  "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another " +
  "Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values."

const forOfLoopElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ForOfStatement): ReadonlyArray<Detection> => {
    const hint = pipe(
      Option.fromNullishOr(node.awaitModifier),
      Option.match({
        onNone: Function.constant(synchronousHint),
        onSome: Function.constant(asynchronousHint)
      })
    )

    const input = {
      node,
      message: "Avoid imperative logic in for..of loops.",
      hint
    }

    return pipe(input, element, Array.of)
  }

  return matches
}

const forOfStatementKinds = Array.of(forOfStatementKind)

export const noForOfLoops = defineCheck(
  "no-for-of-loops",
  forOfStatementKinds,
  ts.isForOfStatement,
  forOfLoopElements
)
