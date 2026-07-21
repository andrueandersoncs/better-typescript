import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  noForOfLoopsMatcher,
  type NoForOfLoopsFact
} from "@better-typescript/matchers/builtins/noForOfLoops"
import { makeBuiltinPolicy } from "../definePolicy.js"

const synchronousHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

const asynchronousHint =
  "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another " +
  "Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values."

const noForOfLoopsGuidance: Guidance<NoForOfLoopsFact> = () => (match) =>
  makeFindings(
    match.target,
    "Avoid imperative logic in for..of loops.",
    match.fact.isAsync ? asynchronousHint : synchronousHint,
    match.fact
  )

export const noForOfLoops = makeBuiltinPolicy(
  "no-for-of-loops",
  noForOfLoopsMatcher,
  noForOfLoopsGuidance
)
