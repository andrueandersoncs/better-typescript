import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { isArrayLikeType } from "./support/tsType.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

// ArrayPrototypeMethod is shared method-name vocabulary because detection and policy must agree.
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

const hint =
  "Prefer Effect's Array module — define the array as a const and call " +
  "Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), " +
  "or the matching Array.* helper — instead of invoking Array.prototype methods " +
  "directly on array values."

const preferEffectArrayMatches = (context: CheckContext) => {
  const checker = context.checker
  const isReceiverArrayType = isArrayLikeType(checker)
  const match = detection(context)

  const matches = (callExpression: ts.CallExpression): ReadonlyArray<Detection> => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return Array.empty()
    }

    const propertyAccess = callExpression.expression

    const methodName = HashSet.has(
      arrayPrototypeMethods,
      propertyAccess.name.text as ArrayPrototypeMethod
    )
      ? Option.some(propertyAccess.name.text as ArrayPrototypeMethod)
      : Option.none()

    if (Option.isNone(methodName)) {
      return Array.empty()
    }

    const receiverType = checker.getTypeAtLocation(propertyAccess.expression)
    const methodCall = isReceiverArrayType(receiverType) ? methodName : Option.none()

    return pipe(
      methodCall,
      Option.map((methodName: ArrayPrototypeMethod) =>
        match({
          node: callExpression,
          message: `Avoid Array.prototype.${methodName}().`,
          hint
        })
      ),
      Option.toArray
    )
  }

  return matches
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const check = nodeCheck(callExpressionKinds)(ts.isCallExpression)(preferEffectArrayMatches)

export const preferEffectArray: Check = check

export const preferEffectArrayExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-array")
