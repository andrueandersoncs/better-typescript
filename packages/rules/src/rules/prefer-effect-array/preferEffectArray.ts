import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { isArrayLikeType } from "../../internal/support/isArrayLikeType.js"
import type { ArrayPrototypeMethod } from "./arrayPrototypeMethod.js"

// PreferEffectArrayFact exists because its fields form one stable data contract used by the linter.
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

export const preferEffectArrayScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  preferEffectArrayMatches
)
