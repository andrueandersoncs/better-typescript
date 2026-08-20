import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Match, Option, Predicate, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

import { propertyNameText } from "../../internal/support/propertyNameText.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

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

const propertySignatureIsUndefinedFreeOptional = (fieldName: string) => (member: ts.TypeElement) =>
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

const schemaOptionalNames = Array.of("optional")

const typeLiteralHasUndefinedFreeOptionalField =
  (fieldName: string) => (typeLiteral: ts.TypeLiteralNode) =>
    Array.some(typeLiteral.members, propertySignatureIsUndefinedFreeOptional(fieldName))

const interfaceHasUndefinedFreeOptionalField =
  (fieldName: string) => (declaration: ts.InterfaceDeclaration) =>
    Array.some(declaration.members, propertySignatureIsUndefinedFreeOptional(fieldName))

const typeAliasHasUndefinedFreeOptionalField = (fieldName: string) => (statement: ts.Statement) =>
  pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(statement),
    Option.map(Struct.get("type")),
    Option.filter(ts.isTypeLiteralNode),
    Option.exists(typeLiteralHasUndefinedFreeOptionalField(fieldName))
  )

const statementProvesUndefinedFreeOptionalField =
  (fieldName: string) => (statement: ts.Statement) => {
    const fromInterface = pipe(
      Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
      Option.exists(interfaceHasUndefinedFreeOptionalField(fieldName))
    )

    const fromTypeAlias = typeAliasHasUndefinedFreeOptionalField(fieldName)(statement)
    const checks = Array.make(fromInterface, fromTypeAlias)

    return Array.some(checks, Boolean)
  }

const sourceFileProvesUndefinedFreeOptionalField =
  (fieldName: string) => (sourceFile: ts.SourceFile) =>
    Array.some(sourceFile.statements, statementProvesUndefinedFreeOptionalField(fieldName))

const callIsSchemaOptional = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker)("Schema")(schemaOptionalNames)(call.expression)

const schemaOptionalKeyMatchForField = (fieldName: string) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), makeSubjectMatch(fieldName))

const optionalKeyFindingForField =
  (context: MatchContext) => (assignment: ts.PropertyAssignment) => (fieldName: string) =>
    pipe(
      assignment.initializer,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(callIsSchemaOptional(context.checker)),
      Option.filter(() =>
        sourceFileProvesUndefinedFreeOptionalField(fieldName)(context.sourceFile)
      ),
      Option.map(schemaOptionalKeyMatchForField(fieldName))
    )

const optionalKeyFindingFromAssignment =
  (context: MatchContext) => (assignment: ts.PropertyAssignment) =>
    pipe(
      propertyNameText(assignment.name),
      Option.flatMap(optionalKeyFindingForField(context)(assignment))
    )

const schemaOptionalKeyFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isPropertyAssignment)(node),
      Option.flatMap(optionalKeyFindingFromAssignment(context)),
      Option.toArray
    )

const schemaOptionalKeyScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  schemaOptionalKeyFindings
)

export const schemaOptionalKey = makeRule("schema-optional-key")(schemaOptionalKeyScanner)(
  fixedRuleMessage(
    "Use Schema.optionalKey for absent fields unless undefined is contractual.",
    "Use optionalKey for absent JSON keys; reserve optional for explicit undefined."
  )
)
