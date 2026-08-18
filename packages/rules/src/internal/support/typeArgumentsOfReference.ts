import * as ts from "typescript"
import { emptyTypes } from "./emptyTypes.js"
import { isObjectType } from "./isObjectType.js"
import { Function, pipe, Option } from "effect"

export const constantEmptyTypes = Function.constant(emptyTypes)

export const objectTypeIsReference = (candidate: ts.ObjectType) =>
  pipe(candidate.objectFlags & ts.ObjectFlags.Reference, Boolean)

export const typeArgumentsOfReference = (checker: ts.TypeChecker) => (candidate: ts.ObjectType) =>
  checker.getTypeArguments(candidate as ts.TypeReference)

export const objectTypeReferenceArguments =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): ReadonlyArray<ts.Type> =>
    pipe(
      type,
      Option.liftPredicate(isObjectType),
      Option.filter(objectTypeIsReference),
      Option.map(typeArgumentsOfReference(checker)),
      Option.getOrElse(constantEmptyTypes)
    )
