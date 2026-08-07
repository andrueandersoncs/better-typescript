import { Array, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { isArrayLikeType } from "../support/isArrayLikeType.js"
import {
  MutableArrayMethod,
  type MutableArrayMethod as MutableArrayMethodT
} from "./mutableArrayMethod.js"
import { mutableArrayMethodNames } from "./mutableArrayMethodNames.js"

// NoMutableArrayMethodsFact names the mutating method because guidance cites the call site.
export const NoMutableArrayMethodsFact = Schema.Struct({
  methodName: MutableArrayMethod
})

export interface NoMutableArrayMethodsFact extends Schema.Schema.Type<
  typeof NoMutableArrayMethodsFact
> {}

const mutableArrayMethods = HashSet.fromIterable(mutableArrayMethodNames)

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

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

export const noMutableArrayMethodsMatcher = nodeMatcher(callExpressionKinds)(ts.isCallExpression)(
  mutableArrayMethodsMatches
)
