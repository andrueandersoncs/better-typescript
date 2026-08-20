import { emptyHeritageClauses } from "../../internal/support/effectApi/emptyHeritageClauses.js"
import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { variableDeclarationNameIsIdentifier } from "../../internal/support/variableDeclarationNameIsIdentifier.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

import { heritageClauseIsExtends } from "../../internal/builtins/effectQuality/schemaRulesShared.js"

const emptyTypeNodes: ReadonlyArray<ts.TypeNode> = Array.empty()

const schemaStructNames = Array.of("Struct")

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
  importedEffectApiAt(checker)("Schema")(schemaStructNames)(call.expression)

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
    const hasInterface = sourceFileHasSchemaRecordInterface(
      (declaration.name as ts.Identifier).text
    )(sourceFile)

    return !hasInterface
  }

const schemaRecordInterfaceFindingFromDeclaration = flow(
  Struct.get<ts.VariableDeclaration, "name">("name"),
  makeSubjectMatch("Schema.Struct")
)

const schemaRecordInterfaceFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(node),
      Option.filter(variableDeclarationNameIsIdentifier),
      Option.filter(declarationHasSchemaStructInitializer(context.checker)),
      Option.filter(declarationLacksSchemaRecordInterface(context.sourceFile)),
      Option.map(schemaRecordInterfaceFindingFromDeclaration),
      Option.toArray
    )

const schemaRecordInterfaceScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  schemaRecordInterfaceFindings
)

export const schemaRecordInterface = makeRule("schema-record-interface")(
  schemaRecordInterfaceScanner
)(
  fixedRuleMessage(
    "Pair a Schema.Struct record with its same-name interface.",
    "Export the decoded interface beside the Schema.Struct declaration."
  )
)
