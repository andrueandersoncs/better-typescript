import { Array, Function, Match, Option, Predicate, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { propertyNameText } from "../../support/propertyNameText.js"

const parenthesizedTypeIncludesUndefined = (parenthesized: ts.ParenthesizedTypeNode) =>
  typeNodeIncludesUndefined(parenthesized.type)

const unionTypeIncludesUndefined = (union: ts.UnionTypeNode) =>
  Array.some(union.types, typeNodeIncludesUndefined)

const typeNodeIncludesUndefined = (typeNode: ts.TypeNode): boolean => {
  const isUndefinedKeyword = strictEqual(ts.SyntaxKind.UndefinedKeyword)(typeNode.kind)

  const nestedIncludes = pipe(
    Match.value(typeNode),
    Match.when(ts.isParenthesizedTypeNode, parenthesizedTypeIncludesUndefined),
    Match.when(ts.isUnionTypeNode, unionTypeIncludesUndefined),
    Match.orElse(Function.constFalse)
  )

  const checks = Array.make(isUndefinedKeyword, nestedIncludes)

  return Array.some(checks, Boolean)
}

const propertyNameTextFromNode = (name: ts.Node) =>
  ts.isPropertyName(name) ? propertyNameText(name) : Option.none()

const propertySignatureNameMatches = (fieldName: string) => (member: ts.PropertySignature) =>
  pipe(
    Option.fromNullishOr(member.name),
    Option.flatMap(propertyNameTextFromNode),
    Option.exists(strictEqual(fieldName))
  )

export const propertySignatureIsUndefinedFreeOptional =
  (fieldName: string) => (member: ts.TypeElement) =>
    pipe(
      Option.liftPredicate(ts.isPropertySignature)(member),
      Option.exists((signature) => {
        const nameMatches = propertySignatureNameMatches(fieldName)(signature)
        const questionToken = Option.fromNullishOr(signature.questionToken)
        const isOptional = Option.isSome(questionToken)
        const typeNode = Option.fromNullishOr(signature.type)

        const undefinedFree = pipe(
          typeNode,
          Option.match({
            onNone: Function.constTrue,
            onSome: Predicate.not(typeNodeIncludesUndefined)
          })
        )

        const checks = Array.make(nameMatches, isOptional, undefinedFree)

        return Array.every(checks, Boolean)
      })
    )
