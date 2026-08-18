import * as ts from "typescript"
import { differentApparentType } from "./differentApparentType.js"
import { differentBaseConstraint } from "./differentBaseConstraint.js"
import { isUnseenType } from "./isUnseenType.js"
import type { SeenTypes } from "./seenTypes.js"
import { pipe, Option, Array } from "effect"

export const hasCallSignatureWithSeen =
  (checker: ts.TypeChecker) =>
  (seen: SeenTypes) =>
  (type: ts.Type): boolean =>
    pipe(
      Option.liftPredicate(isUnseenType(seen))(type),
      Option.exists((type) => {
        const nextSeen = Array.append(seen, type)
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

export const hasCallSignature = (checker: ts.TypeChecker) => {
  const withSeen = hasCallSignatureWithSeen(checker)
  const emptySeen = Array.empty<ts.Type>()

  return withSeen(emptySeen)
}
