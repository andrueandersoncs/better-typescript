import * as ts from "typescript"
import { differentApparentType } from "./differentApparentType.js"
import { differentBaseConstraint } from "./differentBaseConstraint.js"
import { isUnseenType } from "./isUnseenType.js"
import type { SeenTypes } from "./seenTypes.js"
import { pipe, Option, Array } from "effect"

export const isUnionOrIntersectionType = (type: ts.Type): type is ts.UnionOrIntersectionType =>
  type.isUnionOrIntersection()

export const isArrayLikeTypeWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: SeenTypes) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists((type) => {
        const nextSeen = Array.append(seen, type)
        const isDirectArrayType = checker.isArrayType(type) || checker.isTupleType(type)
        const unionOrIntersection = Option.liftPredicate(isUnionOrIntersectionType)(type)
        const checkNestedArrayLike = isArrayLikeTypeWithSeen(checker)(nextSeen)

        const unionOrIntersectionHasArrayLike = (candidate: ts.UnionOrIntersectionType) =>
          Array.some(candidate.types, checkNestedArrayLike)

        const hasUnionOrIntersectionArrayType = Option.exists(
          unionOrIntersection,
          unionOrIntersectionHasArrayLike
        )

        const baseConstraint = differentBaseConstraint(checker)(type)
        const hasConstrainedArrayType = Option.exists(baseConstraint, checkNestedArrayLike)
        const apparentType = differentApparentType(checker)(type)
        const hasApparentArrayType = Option.exists(apparentType, checkNestedArrayLike)

        const conditions = Array.make(
          isDirectArrayType,
          hasUnionOrIntersectionArrayType,
          hasConstrainedArrayType,
          hasApparentArrayType
        )

        return Array.some(conditions, Boolean)
      })
    )

export const isArrayLikeType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): boolean => {
    const withSeen = isArrayLikeTypeWithSeen(checker)
    const emptySeen = Array.empty<ts.Type>()
    const checkType = withSeen(emptySeen)

    return checkType(type)
  }
