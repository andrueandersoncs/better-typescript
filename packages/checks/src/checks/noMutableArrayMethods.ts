import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  differentApparentType,
  differentBaseConstraint,
  isUnseenType
} from "./support/tsType.js"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
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

const isArrayTypeWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists((type) => {
        const nextSeen = HashSet.add(seen, type)
        const isDirectArrayType =
          checker.isArrayType(type) || checker.isTupleType(type)
        const unionOrIntersection = Option.liftPredicate(
          isUnionOrIntersectionType
        )(type)
        const hasUnionOrIntersectionArrayType = Option.exists(
          unionOrIntersection,
          (type) => type.types.some(isArrayTypePart(checker)(nextSeen))
        )
        const baseConstraint = differentBaseConstraint(checker)(type)
        const hasConstrainedArrayType = Option.exists(
          baseConstraint,
          isArrayTypePart(checker)(nextSeen)
        )
        const apparentType = differentApparentType(checker)(type)
        const hasApparentArrayType = Option.exists(
          apparentType,
          isArrayTypePart(checker)(nextSeen)
        )

        return [
          isDirectArrayType,
          hasUnionOrIntersectionArrayType,
          hasConstrainedArrayType,
          hasApparentArrayType
        ].some(Boolean)
      })
    )

const isArrayTypePart =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (part: ts.Type): boolean =>
    isArrayTypeWithSeen(checker)(seen)(part)

const isUnionOrIntersectionType = (
  type: ts.Type
): type is ts.UnionOrIntersectionType => type.isUnionOrIntersection()

const mutableArrayMatches = (context: CheckContext) => {
  const checker = context.checker
  const emptySeen = HashSet.empty<ts.Type>()
  const isReceiverArrayType = isArrayTypeWithSeen(checker)(emptySeen)
  const match = detection(context)

  const matches = (
    callExpression: ts.CallExpression
  ): ReadonlyArray<Detection> => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) {
      return []
    }

    const propertyAccess = callExpression.expression
    const methodName = HashSet.has(
      mutableArrayMethods,
      propertyAccess.name.text as MutableArrayMethod
    )
      ? Option.some(propertyAccess.name.text as MutableArrayMethod)
      : Option.none()

    if (Option.isNone(methodName)) {
      return []
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

const check = nodeCheck([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(
  mutableArrayMatches
)

export const noMutableArrayMethods: Check = check

export const noMutableArrayMethodsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-mutable-array-methods")
