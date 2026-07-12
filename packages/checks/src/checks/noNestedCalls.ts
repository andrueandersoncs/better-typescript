import { Array, flow, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isSameNode } from "./support/tsNode.js"
import { callArguments, isCallLikeExpression } from "./support/tsSignature.js"
import type { CallLikeExpression } from "./support/tsSignature.js"
import { hasCallSignature } from "./support/tsType.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const valueForwardingKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.NonNullExpression,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment,
  ts.SyntaxKind.SpreadAssignment,
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.SpreadElement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.PostfixUnaryExpression,
  ts.SyntaxKind.AwaitExpression,
  ts.SyntaxKind.YieldExpression,
  ts.SyntaxKind.TypeOfExpression,
  ts.SyntaxKind.VoidExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.TemplateSpan,
  ts.SyntaxKind.TemplateExpression
)

const consumingCall = (node: ts.Node): Option.Option<CallLikeExpression> => {
  const parent = node.parent
  const isCallLike = isCallLikeExpression(parent)

  if (isCallLike) {
    return Option.liftPredicate((call: CallLikeExpression) => {
      const args = callArguments(call)

      return Array.some(args, isSameNode(node))
    })(parent)
  }

  const isForwarding = HashSet.has(valueForwardingKinds, node.parent.kind)

  return isForwarding ? consumingCall(node.parent) : Option.none()
}

const ruleHint =
  "A call whose result feeds another call hides a sequence of steps in one expression " +
  "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
  "gen block) and pass the name, or restructure data-last so the value flows through " +
  "pipe. Calls that return functions stay inline: currying and pipe stages read " +
  "left-to-right."

const nestedCallMatches = (context: CheckContext) => {
  const checker = context.checker

  const producesCallable = flow(
    (call: CallLikeExpression) => checker.getTypeAtLocation(call),
    hasCallSignature(checker)
  )

  const sourceFile = context.sourceFile
  const match = detection(context)

  const calleeText = (target: CallLikeExpression): string => {
    const text = target.expression.getText(sourceFile)

    return ts.isNewExpression(target) ? `new ${text}` : text
  }

  const matches = (call: CallLikeExpression): ReadonlyArray<Detection> =>
    pipe(
      consumingCall(call),
      Option.flatMap((consumer) => {
        if (producesCallable(call)) {
          return Option.none()
        }

        const callerExpression = consumer.expression

        const callerName = ts.isIdentifier(callerExpression)
          ? callerExpression.text
          : undefined

        const isPipeName = callerName === "pipe"
        const isCallConsumer = ts.isCallExpression(consumer)
        const isFirstArg = callArguments(consumer)[0] === call
        const isPipeCall = isPipeName && isFirstArg
        const isPipeFirstArg = isCallConsumer && isPipeCall

        if (isPipeFirstArg) {
          return Option.none()
        }

        const callText = calleeText(call)
        const consumerText = calleeText(consumer)

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

const check = nodeCheck([
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.NewExpression
])(isCallLikeExpression)(nestedCallMatches)

export const noNestedCalls: Check = check

export const noNestedCallsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-nested-calls")
