import { Array, flow, Option, pipe } from "effect"
import * as ts from "typescript"
import { callArguments, calleeText, consumingCall } from "./support/tsSignature.js"
import { isCallLikeExpression } from "./support/tsNode.js"
import { hasCallSignature } from "./support/tsType.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

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
  const match = makeDetection(context)
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
        const isPipeName = strictEqual("pipe")(callerName)
        const isCallConsumer = ts.isCallExpression(consumer)
        const consumerArguments = callArguments(consumer)
        const firstArgument = Array.head(consumerArguments)
        const isSameCall = strictEqual(call)
        const isFirstArg = Option.exists(firstArgument, isSameCall)
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

export const noNestedCalls = makeCheck(
  "no-nested-calls",
  callExpressionKinds,
  isCallLikeExpression,
  nestedCallMatches
)
