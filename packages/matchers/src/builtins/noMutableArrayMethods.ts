import { Array, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { isArrayLikeType } from "../support/tsType.js"

const mutableArrayMethodNames = Array.make<
  ["copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"]
>("copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift")

// MutableArrayMethod names mutating Array methods because remediation quotes the method.
export const MutableArrayMethod = Schema.Literals(mutableArrayMethodNames)

export type MutableArrayMethod = typeof MutableArrayMethod.Type

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
  const checker = context.checker
  const isReceiverArrayType = isArrayLikeType(checker)

  const matchMutableArrayMethod = (callExpression: ts.CallExpression) => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return Array.empty()
    }

    const propertyAccess = callExpression.expression
    const methodText = propertyAccess.name.text

    const methodName = HashSet.has(mutableArrayMethods, methodText as MutableArrayMethod)
      ? Option.some(methodText as MutableArrayMethod)
      : Option.none<MutableArrayMethod>()

    if (Option.isNone(methodName)) {
      return Array.empty()
    }

    const receiverType = checker.getTypeAtLocation(propertyAccess.expression)
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
