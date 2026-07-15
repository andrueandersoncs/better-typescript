import { Array, flow, Option, pipe } from "effect"
import * as ts from "typescript"
import {
  callArguments,
  calleeText,
  consumingCall,
  isCallLikeExpression
} from "./support/tsSignature.js"
import { hasCallSignature } from "./support/tsType.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const ruleHint =
  "A call whose result feeds another call hides a sequence of steps in one expression " +
  "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
  "gen block) and pass the name, or restructure data-last so the value flows through " +
  "pipe. Calls that return functions stay inline: currying and pipe stages read " +
  "left-to-right."

const nestedCallMatches = (context: CheckContext) => {
  const checker = context.checker

  const producesCallable = flow(
    (call: ts.CallExpression | ts.NewExpression) => checker.getTypeAtLocation(call),
    hasCallSignature(checker)
  )

  const sourceFile = context.sourceFile
  const match = detection(context)
  const callLabel = calleeText(sourceFile)

  const matches = (call: ts.CallExpression | ts.NewExpression): ReadonlyArray<Detection> =>
    pipe(
      consumingCall(call),
      Option.flatMap((consumer) => {
        if (producesCallable(call)) {
          return Option.none()
        }

        const callerExpression = consumer.expression
        const callerName = ts.isIdentifier(callerExpression) ? callerExpression.text : undefined
        const isPipeName = callerName === "pipe"
        const isCallConsumer = ts.isCallExpression(consumer)
        const isFirstArg = callArguments(consumer)[0] === call
        const isPipeCall = isPipeName && isFirstArg
        const isPipeFirstArg = isCallConsumer && isPipeCall

        if (isPipeFirstArg) {
          return Option.none()
        }

        const callText = callLabel(call)
        const consumerText = callLabel(consumer)

        const ruleMatch = match({
          node: call,
          message: `Avoid computing ${callText} inline in the arguments of ${consumerText}.`,
          hint: ruleHint
        })

        return Option.some(ruleMatch)
      }),
      Option.toArray
    )

  return matches
}

const callExpressionKinds = Array.make(ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression)

const check = nodeCheck(callExpressionKinds)(isCallLikeExpression)(nestedCallMatches)

export const noNestedCalls: Check = check

export const noNestedCallsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-nested-calls")
