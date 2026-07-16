import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { isCallLikeExpression } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { definePlannedCheck } from "../defineCheck.js"
import { nodeSubscriptions, detection } from "@better-typescript/core/engine/check"

const isArrayIdentifier = (identifier: ts.Identifier): boolean => identifier.text === "Array"

const message = "Avoid primitive Array constructors."

const hint =
  "Use Effect's Array module instead — Array.empty() for an empty array, " +
  "Array.of(value) or Array.make(...) for elements, Array.allocate(n) for a " +
  "fixed length, and Array.fromIterable for an iterable."

const arrayLiteralMatches = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.ArrayLiteralExpression): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message,
        hint
      },
      element,
      Array.of
    )

  return matches
}

const arrayConstructorMatches = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    if (!isCallLikeExpression(node)) {
      return Array.empty()
    }

    const isBareArray = pipe(
      Option.liftPredicate(ts.isIdentifier)(node.expression),
      Option.exists(isArrayIdentifier)
    )

    if (!isBareArray) {
      return Array.empty()
    }

    return pipe(
      {
        node,
        message,
        hint
      },
      element,
      Array.of
    )
  }

  return matches
}

const arrayLiteralKinds = Array.of(ts.SyntaxKind.ArrayLiteralExpression)

const arrayLiteralListeners = nodeSubscriptions(arrayLiteralKinds)(ts.isArrayLiteralExpression)(
  arrayLiteralMatches
)

const arrayConstructorKinds = Array.make(ts.SyntaxKind.NewExpression, ts.SyntaxKind.CallExpression)

const arrayConstructorListeners =
  nodeSubscriptions(arrayConstructorKinds)(isCallLikeExpression)(arrayConstructorMatches)

const arrayConstructorSubscriptions = Array.make(arrayLiteralListeners, arrayConstructorListeners)

const arrayConstructorSubscriptionList = Array.flatten(arrayConstructorSubscriptions)

const arrayConstructorPlan = Function.constant(arrayConstructorSubscriptionList)

export const noPrimitiveArrayConstructors = definePlannedCheck(
  "no-primitive-array-constructors",
  arrayConstructorPlan
)
