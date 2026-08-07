import { Match, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { emptyMemberPath } from "./emptyMemberPath.js"
import { makePathWithMember } from "./makePathWithMember.js"
import { importedMemberFromPath } from "./importBindingAt.js"

const identifierEmptyPath2 = (identifier: ts.Identifier) => Tuple.make(identifier, emptyMemberPath)

const qualifiedNamePath = (qualifiedName: ts.QualifiedName) =>
  pipe(entityNamePath(qualifiedName.left), makePathWithMember(qualifiedName.right.text))

const entityNamePath = (name: ts.EntityName): readonly [ts.Identifier, ReadonlyArray<string>] =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, identifierEmptyPath2),
    Match.orElse(qualifiedNamePath)
  )

export const importedTypeMemberAt = (checker: ts.TypeChecker, name: ts.EntityName) => {
  const path = entityNamePath(name)

  return importedMemberFromPath(checker, path)
}
