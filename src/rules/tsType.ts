import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"

export const isVoidType = (type: ts.Type): boolean =>
  (type.flags & ts.TypeFlags.Void) !== 0

export const permitsVoid = (type: ts.Type): boolean =>
  type.isUnion() ? type.types.some(isVoidType) : isVoidType(type)

export const isDifferentType =
  (type: ts.Type) =>
  (other: ts.Type): boolean =>
    other !== type

export const differentBaseConstraint = (
  checker: ts.TypeChecker,
  type: ts.Type
): Option.Option<ts.Type> => {
  const baseConstraint = checker.getBaseConstraintOfType(type)

  return pipe(
    Option.fromNullable(baseConstraint),
    Option.filter(isDifferentType(type))
  )
}

export const differentApparentType = (
  checker: ts.TypeChecker,
  type: ts.Type
): Option.Option<ts.Type> => {
  const apparentType = checker.getApparentType(type)

  return Option.liftPredicate(isDifferentType(type))(apparentType)
}

export const callSignatureCheck =
  (checker: ts.TypeChecker, seen: HashSet.HashSet<ts.Type> = HashSet.empty()) =>
  (type: ts.Type): boolean =>
    hasCallSignature(checker, type, seen)

export const isUnseenType =
  (seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean =>
    !HashSet.has(seen, type)

const computeCallSignature =
  (checker: ts.TypeChecker, seen: HashSet.HashSet<ts.Type>) =>
  (type: ts.Type): boolean => {
    const nextSeen = HashSet.add(seen, type)
    const hasDirectCallSignature = type.getCallSignatures().length > 0

    if (type.isUnionOrIntersection()) {
      return (
        hasDirectCallSignature ||
        type.types.some(callSignatureCheck(checker, nextSeen))
      )
    }

    const baseConstraint = differentBaseConstraint(checker, type)
    const apparentType = differentApparentType(checker, type)
    const constraintHasCallSignature = Option.exists(
      baseConstraint,
      callSignatureCheck(checker, nextSeen)
    )
    const apparentTypeHasCallSignature = Option.exists(
      apparentType,
      callSignatureCheck(checker, nextSeen)
    )
    const hasIndirectCallSignature =
      constraintHasCallSignature || apparentTypeHasCallSignature

    return hasDirectCallSignature || hasIndirectCallSignature
  }

export const hasCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: HashSet.HashSet<ts.Type> = HashSet.empty()
): boolean =>
  pipe(
    Option.liftPredicate(isUnseenType(seen))(type),
    Option.exists(computeCallSignature(checker, seen))
  )
