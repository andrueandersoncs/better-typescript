import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"

export const isVoidType = (type: ts.Type): boolean =>
  (type.flags & ts.TypeFlags.Void) !== 0

// A contextual return of any/unknown accepts a void-returning implementation, so a consumer contract typed that way (lib.dom handler slots) still permits void.
const voidCompatibleFlags =
  ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown

const isVoidCompatibleType = (type: ts.Type): boolean =>
  (type.flags & voidCompatibleFlags) !== 0

export const permitsVoid = (type: ts.Type): boolean =>
  type.isUnion()
    ? type.types.some(isVoidCompatibleType)
    : isVoidCompatibleType(type)

export const isDifferentType =
  (type: ts.Type) =>
  (other: ts.Type): boolean =>
    other !== type

export const differentBaseConstraint =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): Option.Option<ts.Type> => {
    const baseConstraint = checker.getBaseConstraintOfType(type)

    return pipe(
      Option.fromNullable(baseConstraint),
      Option.filter(isDifferentType(type))
    )
  }

export const differentApparentType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): Option.Option<ts.Type> => {
    const apparentType = checker.getApparentType(type)

    return Option.liftPredicate(isDifferentType(type))(apparentType)
  }

const callSignatureCheckWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    hasCallSignatureWithSeen(checker)(seen)(type)

export const isUnseenType =
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    !HashSet.has(seen, type)

const computeCallSignature =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean => {
    const nextSeen = HashSet.add(seen, type)
    const hasDirectCallSignature = type.getCallSignatures().length > 0

    if (type.isUnionOrIntersection()) {
      return (
        hasDirectCallSignature ||
        type.types.some(callSignatureCheckWithSeen(checker)(nextSeen))
      )
    }

    const baseConstraint = differentBaseConstraint(checker)(type)
    const apparentType = differentApparentType(checker)(type)
    const constraintHasCallSignature = Option.exists(
      baseConstraint,
      callSignatureCheckWithSeen(checker)(nextSeen)
    )
    const apparentTypeHasCallSignature = Option.exists(
      apparentType,
      callSignatureCheckWithSeen(checker)(nextSeen)
    )
    const hasIndirectCallSignature =
      constraintHasCallSignature || apparentTypeHasCallSignature

    return hasDirectCallSignature || hasIndirectCallSignature
  }

const hasCallSignatureWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists(computeCallSignature(checker)(seen))
    )

export const callSignatureCheck = (checker: ts.TypeChecker) => {
  const seen = HashSet.empty<ts.Type>()

  return hasCallSignatureWithSeen(checker)(seen)
}

export const hasCallSignature = callSignatureCheck
