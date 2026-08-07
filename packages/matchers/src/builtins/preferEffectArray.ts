import { Array, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { isArrayLikeType } from "../support/isArrayLikeType.js"
import type { ArrayPrototypeMethod } from "./arrayPrototypeMethod.js"

// PreferEffectArrayFact records the prototype method because guidance names the replacement.
export const PreferEffectArrayFact = Schema.Struct({
  method: Schema.String
})

export interface PreferEffectArrayFact extends Schema.Schema.Type<typeof PreferEffectArrayFact> {}

const arrayPrototypeMethods = HashSet.make(
  "at" as ArrayPrototypeMethod,
  "concat" as ArrayPrototypeMethod,
  "copyWithin" as ArrayPrototypeMethod,
  "entries" as ArrayPrototypeMethod,
  "every" as ArrayPrototypeMethod,
  "fill" as ArrayPrototypeMethod,
  "filter" as ArrayPrototypeMethod,
  "find" as ArrayPrototypeMethod,
  "findIndex" as ArrayPrototypeMethod,
  "findLast" as ArrayPrototypeMethod,
  "findLastIndex" as ArrayPrototypeMethod,
  "flat" as ArrayPrototypeMethod,
  "flatMap" as ArrayPrototypeMethod,
  "forEach" as ArrayPrototypeMethod,
  "includes" as ArrayPrototypeMethod,
  "indexOf" as ArrayPrototypeMethod,
  "join" as ArrayPrototypeMethod,
  "keys" as ArrayPrototypeMethod,
  "lastIndexOf" as ArrayPrototypeMethod,
  "map" as ArrayPrototypeMethod,
  "pop" as ArrayPrototypeMethod,
  "push" as ArrayPrototypeMethod,
  "reduce" as ArrayPrototypeMethod,
  "reduceRight" as ArrayPrototypeMethod,
  "reverse" as ArrayPrototypeMethod,
  "shift" as ArrayPrototypeMethod,
  "slice" as ArrayPrototypeMethod,
  "some" as ArrayPrototypeMethod,
  "sort" as ArrayPrototypeMethod,
  "splice" as ArrayPrototypeMethod,
  "toLocaleString" as ArrayPrototypeMethod,
  "toReversed" as ArrayPrototypeMethod,
  "toSorted" as ArrayPrototypeMethod,
  "toSpliced" as ArrayPrototypeMethod,
  "toString" as ArrayPrototypeMethod,
  "unshift" as ArrayPrototypeMethod,
  "values" as ArrayPrototypeMethod,
  "with" as ArrayPrototypeMethod
)

const preferEffectArrayMatches = (context: MatchContext) => {
  const isReceiverArrayType = isArrayLikeType(context.checker)

  const matches = (callExpression: ts.CallExpression) => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return Array.empty()
    }

    const methodName: Option.Option<ArrayPrototypeMethod> = HashSet.has(
      arrayPrototypeMethods,
      callExpression.expression.name.text as ArrayPrototypeMethod
    )
      ? Option.some(callExpression.expression.name.text as ArrayPrototypeMethod)
      : Option.none()

    if (Option.isNone(methodName)) {
      return Array.empty()
    }

    const receiverType = context.checker.getTypeAtLocation(callExpression.expression.expression)

    const methodCall: Option.Option<ArrayPrototypeMethod> = isReceiverArrayType(receiverType)
      ? methodName
      : Option.none()

    return pipe(
      methodCall,
      Option.map((method) => {
        const fact = PreferEffectArrayFact.make({ method })
        return makeNodeMatch(callExpression, fact)
      }),
      Option.toArray
    )
  }

  return matches
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

export const preferEffectArrayMatcher = nodeMatcher(callExpressionKinds)(ts.isCallExpression)(
  preferEffectArrayMatches
)
