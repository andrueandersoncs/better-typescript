import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { isArrayLikeType } from "../../internal/support/isArrayLikeType.js"
import {
  MutableArrayMethod,
  type MutableArrayMethod as MutableArrayMethodT
} from "./mutableArrayMethod.js"
import { mutableArrayMethodNames } from "./mutableArrayMethodNames.js"

// NoMutableArrayMethodsFact exists because its fields form one stable data contract used by the linter.
export const NoMutableArrayMethodsFact = Schema.Struct({
  methodName: MutableArrayMethod
})

export interface NoMutableArrayMethodsFact extends Schema.Schema.Type<
  typeof NoMutableArrayMethodsFact
> {}

const mutableArrayMethods = HashSet.fromIterable(mutableArrayMethodNames)

const mutableArrayMethodsMatches = (context: MatchContext) => {
  const isReceiverArrayType = isArrayLikeType(context.checker)

  const matchMutableArrayMethod = (callExpression: ts.CallExpression) => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return Array.empty()
    }

    const methodName = HashSet.has(
      mutableArrayMethods,
      callExpression.expression.name.text as MutableArrayMethodT
    )
      ? Option.some(callExpression.expression.name.text as MutableArrayMethodT)
      : Option.none<MutableArrayMethodT>()

    if (Option.isNone(methodName)) {
      return Array.empty()
    }

    const receiverType = context.checker.getTypeAtLocation(callExpression.expression.expression)
    const fact = NoMutableArrayMethodsFact.make({ methodName: methodName.value })

    const methodFact = isReceiverArrayType(receiverType)
      ? Option.some(fact)
      : Option.none<NoMutableArrayMethodsFact>()

    const matchWithFact = (fact: NoMutableArrayMethodsFact) => makeNodeMatch(callExpression, fact)
    return pipe(methodFact, Option.map(matchWithFact), Option.toArray)
  }

  return matchMutableArrayMethod
}

export const noMutableArrayMethodsScanner = makeNodeScanner(callExpressionKinds)(
  ts.isCallExpression
)(mutableArrayMethodsMatches)
