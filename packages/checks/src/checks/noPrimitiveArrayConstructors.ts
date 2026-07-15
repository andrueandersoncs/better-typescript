import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { combineAll, nodeSubscriptions, detection } from "@better-typescript/core/engine/check"

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

/**
 * ArrayConstructorNode is the syntax contract shared by array-constructor
 * candidate detection and matching.
 *
 * @remarks
 *   It remains explicit because both owners need one stable compiler-node
 *   vocabulary; removing it would duplicate the union and let their accepted
 *   expressions drift.
 * @modelRole shared
 */
export type ArrayConstructorNode = ts.NewExpression | ts.CallExpression

const isArrayConstructorNode = (node: ts.Node): node is ArrayConstructorNode =>
  ts.isNewExpression(node) || ts.isCallExpression(node)

const arrayConstructorMatches = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ArrayConstructorNode): ReadonlyArray<Detection> => {
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
  nodeSubscriptions(arrayConstructorKinds)(isArrayConstructorNode)(arrayConstructorMatches)

const arrayConstructorSubscriptions = Array.make(arrayLiteralListeners, arrayConstructorListeners)

export const noPrimitiveArrayConstructors: Check = combineAll(arrayConstructorSubscriptions)

export const noPrimitiveArrayConstructorsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-primitive-array-constructors")
