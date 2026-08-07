import { Array, Function, Match, Option, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { MatchContext } from "../../matcher/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import type { ImportedMember } from "./importedMember.js"
import { importedMemberAt } from "./importedMemberAt.js"
import { importedTypeMemberAt } from "./importedTypeMemberAt.js"
import { memberIsForbiddenDomain } from "./memberIsForbiddenDomain.js"
import { noneString } from "../../support/noneString.js"
import { nodeOwnsChild } from "../../support/nodeOwnsChild.js"

export const noneIdentifier: Option.Option<ts.Identifier> = Option.none()

export const constantNoneIdentifier = Function.constant(noneIdentifier)

export const constantNoneString = Function.constant(noneString)

export const rootIdentifierFromAccess = (access: ts.PropertyAccessExpression) =>
  propertyAccessRootIdentifier(access.expression)

export const propertyAccessRootIdentifier = (
  expression: ts.Expression
): Option.Option<ts.Identifier> =>
  pipe(
    Match.value(expression),
    Match.when(ts.isIdentifier, Option.some<ts.Identifier>),
    Match.when(ts.isPropertyAccessExpression, rootIdentifierFromAccess),
    Match.orElse(constantNoneIdentifier)
  )

export const qualifiedNameRootIdentifier = (name: ts.EntityName): ts.Identifier =>
  ts.isIdentifier(name) ? name : qualifiedNameRootIdentifier(name.left)

export const propertyAccessForbiddenSubject = (
  context: MatchContext,
  current: ts.PropertyAccessExpression,
  referencesBinding: (candidate: ts.Identifier) => boolean
) =>
  pipe(
    propertyAccessRootIdentifier(current.expression),
    Option.filter(referencesBinding),
    Option.flatMap(() => importedMemberAt(context.checker, current)),
    Option.filter(memberIsForbiddenDomain),
    Option.map(Struct.get("moduleSpecifier"))
  )

export const qualifiedNameForbiddenSubject = (
  context: MatchContext,
  current: ts.QualifiedName,
  referencesBinding: (candidate: ts.Identifier) => boolean
): Option.Option<string> => {
  const root = qualifiedNameRootIdentifier(current)

  if (!referencesBinding(root)) {
    return Option.none()
  }

  return pipe(
    importedTypeMemberAt(context.checker, current),
    Option.filter(memberIsForbiddenDomain),
    Option.map(Struct.get("moduleSpecifier"))
  )
}

export const bareBindingForbiddenSubject = (binding: Option.Option<ImportedMember>) =>
  pipe(binding, Option.filter(memberIsForbiddenDomain), Option.map(Struct.get("moduleSpecifier")))

const propertyAccessExpression = Struct.get<ts.PropertyAccessExpression, "expression">("expression")
const qualifiedNameLeft = Struct.get<ts.QualifiedName, "left">("left")

export const identifierIsPropertyAccessRoot = nodeOwnsChild(
  ts.isPropertyAccessExpression,
  propertyAccessExpression
)

export const identifierIsQualifiedNameRoot = nodeOwnsChild(ts.isQualifiedName, qualifiedNameLeft)

export const namespaceBindingSubject = (context: MatchContext, identifier: ts.Identifier) => {
  const symbolAtIdentifier = context.checker.getSymbolAtLocation(identifier)
  const bindingSymbolOption = Option.fromNullishOr(symbolAtIdentifier)
  const binding = importedMemberAt(context.checker, identifier)

  return pipe(
    Option.all({ bindingSymbol: bindingSymbolOption, binding }),
    Option.flatMap(({ bindingSymbol }) => {
      const referencesBinding = flow(
        (candidate: ts.Identifier) => context.checker.getSymbolAtLocation(candidate),
        strictEqual(bindingSymbol)
      )

      const subjectFromIdentifier = (current: ts.Identifier): Option.Option<string> => {
        const isSelf = strictEqual(identifier)(current)
        const bound = referencesBinding(current)
        const unbound = strictEqual(false)(bound)
        const skipChecks = Array.make(isSelf, unbound)

        if (Array.some(skipChecks, Boolean)) {
          return Option.none()
        }

        const isPropertyRoot = identifierIsPropertyAccessRoot(current.parent, current)
        const isQualifiedRoot = identifierIsQualifiedNameRoot(current.parent, current)
        const memberAccessRoots = Array.make(isPropertyRoot, isQualifiedRoot)
        const isMemberAccessRoot = Array.some(memberAccessRoots, Boolean)

        return isMemberAccessRoot ? Option.none() : bareBindingForbiddenSubject(binding)
      }

      const propertyAccessForbiddenSubjectOf = (access: ts.PropertyAccessExpression) =>
        propertyAccessForbiddenSubject(context, access, referencesBinding)

      const qualifiedNameForbiddenSubjectOf = (qualified: ts.QualifiedName) =>
        qualifiedNameForbiddenSubject(context, qualified, referencesBinding)

      const reduceForbiddenSubject = (subject: Option.Option<string>, current: ts.Node) => {
        if (Option.isSome(subject)) {
          return subject
        }

        return pipe(
          Match.value(current),
          Match.when(ts.isPropertyAccessExpression, propertyAccessForbiddenSubjectOf),
          Match.when(ts.isQualifiedName, qualifiedNameForbiddenSubjectOf),
          Match.when(ts.isIdentifier, subjectFromIdentifier),
          Match.orElse(constantNoneString)
        )
      }

      const fold = foldAst(reduceForbiddenSubject)

      return fold(context.sourceFile)(noneString)
    })
  )
}

export const forbiddenDomainMemberAt = (
  context: MatchContext,
  identifier: ts.Identifier,
  inspectNamespaceUsage: boolean
) =>
  pipe(
    importedMemberAt(context.checker, identifier),
    Option.flatMap((member) => {
      const isNamespaceBinding = strictEqual(0)(member.path.length)
      const inspectFlags = Array.make(inspectNamespaceUsage, isNamespaceBinding)
      const shouldInspectNamespace = Array.every(inspectFlags, Boolean)

      if (shouldInspectNamespace) {
        return namespaceBindingSubject(context, identifier)
      }

      return pipe(
        Option.some(member),
        Option.filter(memberIsForbiddenDomain),
        Option.map(Struct.get("moduleSpecifier"))
      )
    })
  )

export const firstForbiddenDomainMember = (
  context: MatchContext,
  identifiers: ReadonlyArray<ts.Identifier>,
  inspectNamespaceUsage: boolean
) => {
  const forbiddenDomainMemberAtOf = (identifier: ts.Identifier) =>
    forbiddenDomainMemberAt(context, identifier, inspectNamespaceUsage)

  return pipe(
    identifiers,
    Array.map(forbiddenDomainMemberAtOf),
    Array.findFirst(Option.isSome),
    Option.flatten
  )
}
