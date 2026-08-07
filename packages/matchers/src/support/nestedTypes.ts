import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { emptyTypes } from "./emptyTypes.js"
import { objectTypeReferenceArguments } from "./typeArgumentsOfReference.js"
import { pipe, Array } from "effect"

export const nestedTypes =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): ReadonlyArray<ts.Type> => {
    const unionMembers = type.isUnion() ? type.types : emptyTypes
    const aliasArguments = type.aliasTypeArguments ?? emptyTypes
    const referenceArguments = objectTypeReferenceArguments(checker)(type)

    return pipe(
      unionMembers,
      Array.appendAll(aliasArguments),
      Array.appendAll(referenceArguments),
      Array.dedupeWith((self, that) => strictEqual(that)(self))
    )
  }
