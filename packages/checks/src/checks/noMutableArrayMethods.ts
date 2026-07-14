import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isArrayLikeType } from "./support/tsType.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

/**
 * MutableArrayMethod is the shared length contract used by mutableArrayMatches and
 * mutableArrayMethods.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
type MutableArrayMethod =
  | "copyWithin"
  | "fill"
  | "pop"
  | "push"
  | "reverse"
  | "shift"
  | "sort"
  | "splice"
  | "unshift"

const mutableArrayMethods = HashSet.make(
  "copyWithin" as MutableArrayMethod,
  "fill" as MutableArrayMethod,
  "pop" as MutableArrayMethod,
  "push" as MutableArrayMethod,
  "reverse" as MutableArrayMethod,
  "shift" as MutableArrayMethod,
  "sort" as MutableArrayMethod,
  "splice" as MutableArrayMethod,
  "unshift" as MutableArrayMethod
)

const mutableArrayMatches = (context: CheckContext) => {
  const checker = context.checker
  const isReceiverArrayType = isArrayLikeType(checker)
  const match = detection(context)

  const matches = (
    callExpression: ts.CallExpression
  ): ReadonlyArray<Detection> => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return Array.empty()
    }

    const propertyAccess = callExpression.expression

    const methodName = HashSet.has(
      mutableArrayMethods,
      propertyAccess.name.text as MutableArrayMethod
    )
      ? Option.some(propertyAccess.name.text as MutableArrayMethod)
      : Option.none()

    if (Option.isNone(methodName)) {
      return Array.empty()
    }

    const receiverType = checker.getTypeAtLocation(propertyAccess.expression)

    const methodCall = isReceiverArrayType(receiverType)
      ? methodName
      : Option.none()

    return pipe(
      methodCall,
      Option.map((methodName: MutableArrayMethod) =>
        match({
          node: callExpression,
          message: `Avoid mutating arrays with Array.prototype.${methodName}().`,
          hint:
            "This is a sign that you're doing something fundamentally procedural when you should " +
            "be taking a more functional approach. Use Effect's Array module, such as " +
            "Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax " +
            "instead of manipulating an array in place."
        })
      ),
      Option.toArray
    )
  }

  return matches
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const check = nodeCheck(callExpressionKinds)(ts.isCallExpression)(
  mutableArrayMatches
)

export const noMutableArrayMethods: Check = check

export const noMutableArrayMethodsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-mutable-array-methods")
