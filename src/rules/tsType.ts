import { Option } from "effect"
import type * as ts from "typescript"

export const isDifferentType = (type: ts.Type) => (other: ts.Type): boolean => other !== type

export const differentBaseConstraint = (
  checker: ts.TypeChecker,
  type: ts.Type
): Option.Option<ts.Type> => {
  const baseConstraint = checker.getBaseConstraintOfType(type)

  return Option.fromNullable(baseConstraint).pipe(Option.filter(isDifferentType(type)))
}

export const differentApparentType = (
  checker: ts.TypeChecker,
  type: ts.Type
): Option.Option<ts.Type> => {
  const apparentType = checker.getApparentType(type)

  return Option.liftPredicate(isDifferentType(type))(apparentType)
}

// Whether a type is callable, looking through union and intersection members, base
// constraints, and apparent types. Shared by no-callbacks (does a parameter accept a
// function?) and no-nested-calls (does a call return a function?).
export const callSignatureCheck =
  (checker: ts.TypeChecker, seen: ReadonlySet<ts.Type> = new Set()) =>
  (type: ts.Type): boolean =>
    hasCallSignature(checker, type, seen)

export const hasCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type> = new Set()
): boolean => {
  const isUnseen = !seen.has(type)

  return isUnseen && hasUnseenCallSignature(checker, type, seen)
}

const hasUnseenCallSignature = (
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: ReadonlySet<ts.Type>
): boolean => {
  const nextSeen = new Set(seen).add(type)
  const hasDirectCallSignature = type.getCallSignatures().length > 0

  if (type.isUnionOrIntersection()) {
    return hasDirectCallSignature || type.types.some(callSignatureCheck(checker, nextSeen))
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
  const hasIndirectCallSignature = constraintHasCallSignature || apparentTypeHasCallSignature

  return hasDirectCallSignature || hasIndirectCallSignature
}
