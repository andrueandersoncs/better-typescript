import { Array, HashSet, Option, Schema, flow, pipe } from "effect"
import * as ts from "typescript"
import { isCallLikeExpression } from "../../internal/support/isCallLikeExpression.js"
import type { CallLikeExpression } from "../../internal/support/callLikeExpression.js"
import { callArguments } from "../../internal/support/callArguments.js"
import { hasCallSignature } from "../../internal/support/hasCallSignature.js"
import { strictEqual } from "../../internal/equivalence.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"

// NoNestedCallsFact exists because its fields form one stable data contract used by the linter.
export const NoNestedCallsFact = Schema.Struct({
  callText: Schema.String,
  consumerText: Schema.String
})

export interface NoNestedCallsFact extends Schema.Schema.Type<typeof NoNestedCallsFact> {}

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
  const isCallLike = isCallLikeExpression(node.parent)

  if (isCallLike) {
    return Option.liftPredicate((call: CallLikeExpression) => {
      const args = callArguments(call)

      return Array.some(args, strictEqual(node))
    })(node.parent)
  }

  const isForwarding = HashSet.has(valueForwardingKinds, node.parent.kind)

  return isForwarding ? consumingCall(node.parent) : Option.none()
}

const calleeText = (sourceFile: ts.SourceFile) => (target: CallLikeExpression) => {
  const text = target.expression.getText(sourceFile)

  return ts.isNewExpression(target) ? `new ${text}` : text
}

const nestedCallsMatches = (context: MatchContext) => {
  const producesCallable = flow(
    (call: ts.CallExpression | ts.NewExpression) => context.checker.getTypeAtLocation(call),
    hasCallSignature(context.checker)
  )

  const callLabel = calleeText(context.sourceFile)

  const matchNestedCall = (call: ts.CallExpression | ts.NewExpression) =>
    pipe(
      consumingCall(call),
      Option.flatMap((consumer) => {
        if (producesCallable(call)) {
          return Option.none()
        }

        const callerName = ts.isIdentifier(consumer.expression)
          ? consumer.expression.text
          : undefined

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
        const match = makeNodeMatch(call, fact)

        return Option.some(match)
      }),
      Option.toArray
    )

  return matchNestedCall
}

const callLikeKinds = Array.make(ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression)

export const noNestedCallsScanner =
  makeNodeScanner(callLikeKinds)(isCallLikeExpression)(nestedCallsMatches)
