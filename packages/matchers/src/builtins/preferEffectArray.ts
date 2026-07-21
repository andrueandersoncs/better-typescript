import { Array, HashSet, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { isArrayLikeType } from "../support/tsType.js"

// ArrayPrototypeMethod is a local syntax union because matchers need one narrowed node shape.
export type ArrayPrototypeMethod =
  | "at"
  | "concat"
  | "copyWithin"
  | "entries"
  | "every"
  | "fill"
  | "filter"
  | "find"
  | "findIndex"
  | "findLast"
  | "findLastIndex"
  | "flat"
  | "flatMap"
  | "forEach"
  | "includes"
  | "indexOf"
  | "join"
  | "keys"
  | "lastIndexOf"
  | "map"
  | "pop"
  | "push"
  | "reduce"
  | "reduceRight"
  | "reverse"
  | "shift"
  | "slice"
  | "some"
  | "sort"
  | "splice"
  | "toLocaleString"
  | "toReversed"
  | "toSorted"
  | "toSpliced"
  | "toString"
  | "unshift"
  | "values"
  | "with"

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
  const checker = context.checker
  const isReceiverArrayType = isArrayLikeType(checker)

  const matches = (callExpression: ts.CallExpression) => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return Array.empty()
    }

    const propertyAccess = callExpression.expression

    const methodName: Option.Option<ArrayPrototypeMethod> = HashSet.has(
      arrayPrototypeMethods,
      propertyAccess.name.text as ArrayPrototypeMethod
    )
      ? Option.some(propertyAccess.name.text as ArrayPrototypeMethod)
      : Option.none()

    if (Option.isNone(methodName)) {
      return Array.empty()
    }

    const receiverType = checker.getTypeAtLocation(propertyAccess.expression)

    const methodCall: Option.Option<ArrayPrototypeMethod> = isReceiverArrayType(receiverType)
      ? methodName
      : Option.none()

    return pipe(
      methodCall,
      Option.map((method) => {
        const fact = PreferEffectArrayFact.make({ method })
        return nodeMatch(callExpression, fact)
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
