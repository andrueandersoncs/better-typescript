import { Array, flow, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { callArguments, calleeText, consumingCall } from "../support/tsSignature.js"
import { isCallLikeExpression } from "../support/tsNode.js"
import { hasCallSignature } from "../support/tsType.js"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"

// NoNestedCallsFact pairs callee labels because guidance names both call sites.
export const NoNestedCallsFact = Schema.Struct({
  callText: Schema.String,
  consumerText: Schema.String
})

export interface NoNestedCallsFact extends Schema.Schema.Type<typeof NoNestedCallsFact> {}

const nestedCallsMatches = (context: MatchContext) => {
  const checker = context.checker

  const producesCallable = flow(
    (call: ts.CallExpression | ts.NewExpression) => checker.getTypeAtLocation(call),
    hasCallSignature(checker)
  )

  const sourceFile = context.sourceFile
  const callLabel = calleeText(sourceFile)

  const matchNestedCall = (call: ts.CallExpression | ts.NewExpression) =>
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
        const fact = NoNestedCallsFact.make({ callText, consumerText })
        const match = nodeMatch(call, fact)

        return Option.some(match)
      }),
      Option.toArray
    )

  return matchNestedCall
}

const callLikeKinds = Array.make(ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression)

export const noNestedCallsMatcher =
  nodeMatcher(callLikeKinds)(isCallLikeExpression)(nestedCallsMatches)
