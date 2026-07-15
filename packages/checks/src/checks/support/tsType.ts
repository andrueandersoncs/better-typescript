import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"

export const isVoidType = (type: ts.Type): boolean => (type.flags & ts.TypeFlags.Void) !== 0

// Contextual any or unknown permits void because the consumer contract accepts a void-returning implementation.
const voidCompatibleFlags = ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown

const isVoidCompatibleType = (type: ts.Type): boolean => (type.flags & voidCompatibleFlags) !== 0

export const permitsVoid = (type: ts.Type): boolean =>
  type.isUnion() ? Array.some(type.types, isVoidCompatibleType) : isVoidCompatibleType(type)

export const isDifferentType =
  (type: ts.Type) =>
  (other: ts.Type): boolean =>
    other !== type

export const differentBaseConstraint =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): Option.Option<ts.Type> =>
    pipe(
      checker.getBaseConstraintOfType(type),
      Option.fromNullable,
      Option.filter(isDifferentType(type))
    )

export const differentApparentType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): Option.Option<ts.Type> =>
    pipe(checker.getApparentType(type), Option.liftPredicate(isDifferentType(type)))

export const isUnseenType =
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    !HashSet.has(seen, type)

const isUnionOrIntersectionType = (type: ts.Type): type is ts.UnionOrIntersectionType =>
  type.isUnionOrIntersection()

const isArrayLikeTypeWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists((type) => {
        const nextSeen = HashSet.add(seen, type)
        const isDirectArrayType = checker.isArrayType(type) || checker.isTupleType(type)
        const unionOrIntersection = Option.liftPredicate(isUnionOrIntersectionType)(type)

        const hasUnionOrIntersectionArrayType = Option.exists(unionOrIntersection, (type) =>
          Array.some(type.types, isArrayLikeTypeWithSeen(checker)(nextSeen))
        )

        const baseConstraint = differentBaseConstraint(checker)(type)

        const hasConstrainedArrayType = Option.exists(
          baseConstraint,
          isArrayLikeTypeWithSeen(checker)(nextSeen)
        )

        const apparentType = differentApparentType(checker)(type)

        const hasApparentArrayType = Option.exists(
          apparentType,
          isArrayLikeTypeWithSeen(checker)(nextSeen)
        )

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
    const emptySeen = HashSet.empty<ts.Type>()
    const checkType = withSeen(emptySeen)

    return checkType(type)
  }

const hasCallSignatureWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists((type) => {
        const nextSeen = HashSet.add(seen, type)
        const hasDirectCallSignature = type.getCallSignatures().length > 0

        if (type.isUnionOrIntersection()) {
          return (
            hasDirectCallSignature ||
            Array.some(type.types, hasCallSignatureWithSeen(checker)(nextSeen))
          )
        }

        const baseConstraint = differentBaseConstraint(checker)(type)
        const apparentType = differentApparentType(checker)(type)

        const constraintHasCallSignature = Option.exists(
          baseConstraint,
          hasCallSignatureWithSeen(checker)(nextSeen)
        )

        const apparentTypeHasCallSignature = Option.exists(
          apparentType,
          hasCallSignatureWithSeen(checker)(nextSeen)
        )

        const hasIndirectCallSignature = constraintHasCallSignature || apparentTypeHasCallSignature

        return hasDirectCallSignature || hasIndirectCallSignature
      })
    )

export const callSignatureCheck = (checker: ts.TypeChecker) => {
  const withSeen = hasCallSignatureWithSeen(checker)
  const emptySeen = HashSet.empty<ts.Type>()

  return withSeen(emptySeen)
}

export const hasCallSignature = callSignatureCheck
