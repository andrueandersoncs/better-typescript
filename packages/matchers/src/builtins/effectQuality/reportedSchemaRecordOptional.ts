import { Array, Function, Match, Option, Predicate, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { importedEffectApiAt } from "../functionalCoreEffect/effectApiMembers.js"
import {
  propertyNameText,
  unwrapTransparentExpression,
  variableDeclarationNameIsIdentifier
} from "../../support/tsNode.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"
import { emptyHeritageClauses, heritageClauseIsExtends } from "./reportedSchemaModelsShared.js"
import { strictEqual } from "@better-typescript/matchers/equivalence"

const emptyTypeNodes: ReadonlyArray<ts.TypeNode> = Array.empty()

const schemaStructNames = Array.of("Struct")

const schemaOptionalNames = Array.of("optional")

const identifierTextEquals = (schemaName: string) => (expression: ts.EntityName) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(expression),
    Option.map(Struct.get("text")),
    Option.contains(schemaName)
  )

const typeQueryTargetsName = (schemaName: string) => (typeNode: ts.TypeNode) =>
  pipe(
    Option.liftPredicate(ts.isTypeQueryNode)(typeNode),
    Option.map(Struct.get("exprName")),
    Option.exists(identifierTextEquals(schemaName))
  )

const heritageExtendsSchemaDecodedType =
  (schemaName: string) => (heritage: ts.ExpressionWithTypeArguments) => {
    const expressionText = heritage.expression.getText()
    const isBareType = strictEqual("Type")(expressionText)
    const isQualifiedType = expressionText.endsWith(".Type")
    const typeReferenceCandidates = Array.make(isBareType, isQualifiedType)
    const referencesType = Array.some(typeReferenceCandidates, Boolean)
    const typeArguments = heritage.typeArguments ?? emptyTypeNodes

    const targetsSchema = pipe(
      Array.head(typeArguments),
      Option.exists(typeQueryTargetsName(schemaName))
    )

    const checks = Array.make(referencesType, targetsSchema)

    return Array.every(checks, Boolean)
  }

const heritageClausePairsWithSchema =
  (extendsSchema: (heritage: ts.ExpressionWithTypeArguments) => boolean) =>
  (clause: ts.HeritageClause) => {
    const isExtends = heritageClauseIsExtends(clause)
    const typeMatches = Array.some(clause.types, extendsSchema)
    const checks = Array.make(isExtends, typeMatches)

    return Array.every(checks, Boolean)
  }

const interfacePairsWithSchema = (schemaName: string) => (declaration: ts.InterfaceDeclaration) => {
  const nameMatches = strictEqual(schemaName)(declaration.name.text)
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses
  const extendsSchema = heritageExtendsSchemaDecodedType(schemaName)
  const heritageMatches = Array.some(clauses, heritageClausePairsWithSchema(extendsSchema))
  const checks = Array.make(nameMatches, heritageMatches)

  return Array.every(checks, Boolean)
}

const statementIsSchemaRecordInterface = (schemaName: string) => (statement: ts.Statement) =>
  pipe(
    Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
    Option.exists(interfacePairsWithSchema(schemaName))
  )

const sourceFileHasSchemaRecordInterface = (schemaName: string) => (sourceFile: ts.SourceFile) =>
  Array.some(sourceFile.statements, statementIsSchemaRecordInterface(schemaName))

const callIsSchemaStruct = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker, call.expression, "Schema", schemaStructNames)

const isSchemaStructCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.exists(callIsSchemaStruct(checker))
  )

const declarationHasSchemaStructInitializer =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
    pipe(Option.fromNullishOr(declaration.initializer), Option.exists(isSchemaStructCall(checker)))

const declarationLacksSchemaRecordInterface =
  (sourceFile: ts.SourceFile) => (declaration: ts.VariableDeclaration) => {
    const name = (declaration.name as ts.Identifier).text
    const hasInterface = sourceFileHasSchemaRecordInterface(name)(sourceFile)

    return !hasInterface
  }

const schemaRecordInterfaceFindingFromDeclaration = (declaration: ts.VariableDeclaration) => {
  const name = declaration.name as ts.Identifier

  return makeRuleFinding("schema-record-interface")(name.text)(name)
}

export const schemaRecordInterfaceFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.filter(variableDeclarationNameIsIdentifier),
    Option.filter(declarationHasSchemaStructInitializer(context.checker)),
    Option.filter(declarationLacksSchemaRecordInterface(context.sourceFile)),
    Option.map(schemaRecordInterfaceFindingFromDeclaration),
    Option.toArray
  )

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

const propertyNameEqualsField = strictEqual

const propertySignatureNameMatches = (fieldName: string) => (member: ts.PropertySignature) =>
  pipe(
    Option.fromNullishOr(member.name),
    Option.flatMap(propertyNameTextFromNode),
    Option.exists(propertyNameEqualsField(fieldName))
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
  importedEffectApiAt(checker, call.expression, "Schema", schemaOptionalNames)

const schemaOptionalKeyFindingFromCall = (fieldName: string) => (call: ts.CallExpression) =>
  makeRuleFinding("schema-optional-key")(fieldName)(call.expression)

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
      Option.map(schemaOptionalKeyFindingFromCall(fieldName))
    )

const optionalKeyFindingFromAssignment =
  (context: MatchContext) => (assignment: ts.PropertyAssignment) =>
    pipe(
      propertyNameText(assignment.name),
      Option.flatMap(optionalKeyFindingForField(context)(assignment))
    )

export const schemaOptionalKeyFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(node),
    Option.flatMap(optionalKeyFindingFromAssignment(context)),
    Option.toArray
  )
