import { Array, Function, Match, Option, Predicate, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { importedEffectApiAt } from "../functionalCoreEffect/support.js"
import { propertyNameText, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"
import { emptyHeritageClauses, heritageClauseIsExtends } from "./reportedSchemaModelsShared.js"

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
    const isBareType = expressionText === "Type"
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

const interfacePairsWithSchema = (schemaName: string) => (declaration: ts.InterfaceDeclaration) => {
  const nameMatches = declaration.name.text === schemaName
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses
  const extendsSchema = heritageExtendsSchemaDecodedType(schemaName)

  const heritageMatches = Array.some(clauses, (clause) => {
    const isExtends = heritageClauseIsExtends(clause)
    const typeMatches = Array.some(clause.types, extendsSchema)
    const checks = Array.make(isExtends, typeMatches)

    return Array.every(checks, Boolean)
  })

  const checks = Array.make(nameMatches, heritageMatches)

  return Array.every(checks, Boolean)
}

const sourceFileHasSchemaRecordInterface = (schemaName: string) => (sourceFile: ts.SourceFile) =>
  Array.some(sourceFile.statements, (statement) =>
    pipe(
      Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
      Option.exists(interfacePairsWithSchema(schemaName))
    )
  )

const isSchemaStructCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.exists((call) =>
      importedEffectApiAt(checker, call.expression, "Schema", schemaStructNames)
    )
  )

export const schemaRecordInterfaceFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.filter((declaration) => ts.isIdentifier(declaration.name)),
    Option.filter((declaration) =>
      pipe(
        Option.fromNullishOr(declaration.initializer),
        Option.exists(isSchemaStructCall(context.checker))
      )
    ),
    Option.filter((declaration) => {
      const name = (declaration.name as ts.Identifier).text
      const hasInterface = sourceFileHasSchemaRecordInterface(name)(context.sourceFile)

      return !hasInterface
    }),
    Option.map((declaration) => {
      const name = declaration.name as ts.Identifier

      return makeRuleFinding("schema-record-interface")(name.text)(name)
    }),
    Option.toArray
  )

const typeNodeIncludesUndefined = (typeNode: ts.TypeNode): boolean => {
  const isUndefinedKeyword = typeNode.kind === ts.SyntaxKind.UndefinedKeyword

  const nestedIncludes = pipe(
    Match.value(typeNode),
    Match.when(ts.isParenthesizedTypeNode, (parenthesized) =>
      typeNodeIncludesUndefined(parenthesized.type)
    ),
    Match.when(ts.isUnionTypeNode, (union) => Array.some(union.types, typeNodeIncludesUndefined)),
    Match.orElse(Function.constFalse)
  )

  const checks = Array.make(isUndefinedKeyword, nestedIncludes)

  return Array.some(checks, Boolean)
}

const propertySignatureNameMatches = (fieldName: string) => (member: ts.PropertySignature) =>
  pipe(
    Option.fromNullishOr(member.name),
    Option.flatMap((name) => (ts.isPropertyName(name) ? propertyNameText(name) : Option.none())),
    Option.exists((name) => name === fieldName)
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

const sourceFileProvesUndefinedFreeOptionalField =
  (fieldName: string) => (sourceFile: ts.SourceFile) =>
    Array.some(sourceFile.statements, (statement) => {
      const fromInterface = pipe(
        Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
        Option.exists(interfaceHasUndefinedFreeOptionalField(fieldName))
      )

      const fromTypeAlias = typeAliasHasUndefinedFreeOptionalField(fieldName)(statement)
      const checks = Array.make(fromInterface, fromTypeAlias)

      return Array.some(checks, Boolean)
    })

export const schemaOptionalKeyFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(node),
    Option.flatMap((assignment) =>
      pipe(
        propertyNameText(assignment.name),
        Option.flatMap((fieldName) =>
          pipe(
            assignment.initializer,
            unwrapTransparentExpression,
            Option.liftPredicate(ts.isCallExpression),
            Option.filter((call) =>
              importedEffectApiAt(context.checker, call.expression, "Schema", schemaOptionalNames)
            ),
            Option.filter(() =>
              sourceFileProvesUndefinedFreeOptionalField(fieldName)(context.sourceFile)
            ),
            Option.map((call) => makeRuleFinding("schema-optional-key")(fieldName)(call.expression))
          )
        )
      )
    ),
    Option.toArray
  )
