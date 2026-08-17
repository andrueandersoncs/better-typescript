import {
  Array,
  Function,
  Option,
  Predicate,
  Result,
  Struct,
  flow,
  pipe,
  Match as EffectMatch
} from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"

import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"

import type { Match } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"

import { foldAst } from "../../sources/foldAst.js"

import type { ArchitectureRole } from "../../support/architectureRoleType.js"

import { collectFindings } from "../../support/collectFindings.js"

import { callExpressionOf } from "../../support/callExpressionOf.js"
import { classDeclarationName } from "../../support/classDeclarationName.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { functionDeclarationName } from "../../support/functionDeclarationName.js"
import { functionInitializer } from "../../support/functionInitializer2.js"
import { binaryAssignmentTarget } from "../../support/hasAssignmentOperator.js"
import { hasExportModifier } from "../../support/hasExportModifier.js"
import { hasParameters } from "../../support/hasParameters.js"
import { isFunctionInitializer } from "../../support/isFunctionInitializer.js"
import { returnStatementExpression } from "../../support/returnStatementExpression.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { variableDeclarationNameIsIdentifier } from "../../support/variableDeclarationNameIsIdentifier.js"

import { symbolDeclaredInEffectPackage } from "../../support/declarationInEffectPackage.js"
import { isEffectInterfaceSymbol } from "../../support/isEffectInterfaceSymbol.js"

import { classExtendsEffectApi } from "../functionalCoreEffect/classExtendsEffectApi.js"
import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

import { effectServiceConfigObject } from "../functionalCoreEffect/effectServiceConfigObject.js"

import { enclosingFunctionLike } from "../functionalCoreEffect/enclosingFunctionLike.js"
import { isTopLevelExportedDeclaration } from "../functionalCoreEffect/isTopLevelExportedDeclaration.js"

import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"
import { importedMemberSubject } from "../functionalCoreEffect/importedMemberSubject.js"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

import { propertyAssignmentNamed } from "../functionalCoreEffect/propertyAssignments.js"

import { accessNameIsPipe } from "./accessNameIsPipe.js"

import { ambientCapabilityPropertySubject } from "../functionalCoreEffect/ambientCapabilityPropertySubject.js"

import { anyKeywordType } from "./anyKeywordType.js"

import { BodyStatusWalk } from "./bodyStatusWalk.js"

import { makeEffectQualityMatcher } from "./buildEffectQualityIndex.js"
import { nestedInsideCacheLookup } from "./cacheMakeLookup.js"

import { callArgumentAt } from "./callArgumentAt.js"

import { callIsHttpResponseSchema } from "./callIsHttpResponseSchema.js"

import { callIsImportedApi } from "./callIsImportedApi.js"

import { callOrPipeStageSubject } from "./callOrPipeStageSubject.js"

import { effectApiCall } from "./effectApiCall.js"

import { effectApiReference } from "./effectApiReference.js"

import { typedErrorFromSelf } from "./effectErrorChannel.js"

import { EffectFnNameInspection } from "./effectFnNameInspection.js"

import { callIsResponseJson } from "./effectIdentity.js"

import { catchCauseNames } from "./catchCauseNames.js"

import { EffectQualityIndex } from "./effectQualityIndex.js"

import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"
import { EffectQualityRuleData } from "./effectQualityRuleData.js"

import { effectReturnTypeOfSignature } from "./effectReturnTypeOfSignature.js"

import { emptyHeritageClauses } from "./emptyHeritageClauses.js"

import { emptyRuleFindings } from "./emptyRuleFindings.js"

import { expressionAccessesStatus } from "./expressionAccessesStatus.js"

import { expressionReferencesName } from "./expressionReferencesName.js"

import { expressionTypeIsEffectReturning } from "./expressionTypeIsEffectReturning.js"

import { functionBodyContains } from "./functionBodyContains.js"

import { functionBodyOf } from "./functionBodyOf.js"

import { functionLikeReturnsEffect } from "./functionLikeReturnsEffect.js"

import { callIsFetch } from "./globalFetchReceivers.js"

import { hasAncestor } from "./hasAncestor.js"

import { heritageClauseIsExtends } from "./heritageClauseIsExtends.js"

import { httpClientRequestNames } from "./httpClientRequestNames.js"

import { httpStatusClassifyNames } from "./httpStatusClassifyNames.js"

import { newMapExpression } from "./identifierTextIsMap.js"

import { identifierIsIt } from "./identifierIsIt.js"

import { identifierTextIsIt } from "./identifierTextIsIt.js"

import { isPipeCall } from "./isPipeCall.js"

import { initializerIsNamedEffectFn } from "./initializerIsNamedEffectFn.js"

import { inspectEffectFnCall } from "./inspectEffectFnCall.js"

import { isExpressionReferenceNode } from "./isExpressionReferenceNode.js"

import { isAccessExpression } from "./isAccessExpression.js"

import { isFunctionLikeExpression } from "./isFunctionLikeExpression.js"

import { isRootRole } from "./isRootRole.js"

import { isTestRole } from "./isTestRole.js"

import { layerAcquisitionNames } from "./layerAcquisitionNames.js"

import { makeRuleFinding } from "./makeRuleFinding.js"

import { mapValueLooksPending } from "./mapValueLooksPending.js"

import { memberIsHttpNamespaceApi } from "./memberIsHttpNamespaceApi.js"

import { objectLiteralArgument } from "./objectLiteralArgument.js"

import { propertySignatureIsUndefinedFreeOptional } from "./parenthesizedTypeIncludesUndefined.js"

import { pipeCallTypedErrorFinding } from "./pipeCallSelfExpression.js"

import { isOutermostAccess } from "../isOutermostAccess.js"
import { isProcessEnvironmentAccess } from "../processEnvironmentAccess.js"

import { serviceMethodFindingForName } from "./propertyEvidenceNode.js"

import { callIsResponseBodyRead } from "./responseBodyNames.js"

import { roleForSourceFile } from "./roleForSourceFile.js"

import type { RuleFindingSource } from "./ruleFindingSource.js"

import { scheduleExpressionIsBounded } from "./scheduleForeverNames.js"

import { schemaClassModelNames } from "./schemaClassModelNames.js"

import { callIsSchemaDecode } from "./callIsSchemaDecode.js"

import { serviceMethodFinding } from "./serviceMethodFinding2.js"

import { serviceMethodSubject } from "./serviceMethodSubject.js"

import { signalParameterName } from "./signalParameterName.js"

import { sleepNames } from "./sleepNames.js"

import { sourceHasAdapterRole } from "./sourceHasAdapterRole.js"

import { statusPropertyNames } from "./statusPropertyNames.js"

import { typeMentionsConstructor } from "./typeArgsOfTypeReference.js"

import { typedErrorRecoveryFinding } from "./typedErrorRecoveryFinding.js"

import { unsafeCastFindingFromTypeNode } from "./unsafeCastFindingFromTypeNode.js"

const ambientCapabilitySubject = (context: MatchContext) => (access: ts.PropertyAccessExpression) =>
  ambientCapabilityPropertySubject(context, access)

const cacheMakeNames = Array.make("make", "makeWith")

const configStringNames = Array.of("string")

const asExpressionHasAnyType = (expression: ts.AsExpression) => anyKeywordType(expression.type)

const typeAssertionHasAnyType = (expression: ts.TypeAssertion) => anyKeywordType(expression.type)

const asExpressionUnsafeCastFinding = (expression: ts.AsExpression) =>
  unsafeCastFindingFromTypeNode(expression.type)

const typeAssertionUnsafeCastFinding = (expression: ts.TypeAssertion) =>
  unsafeCastFindingFromTypeNode(expression.type)

const unsafeCastFindings = (
  _context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const asAny = pipe(
    Option.liftPredicate(ts.isAsExpression)(node),
    Option.filter(asExpressionHasAnyType),
    Option.map(asExpressionUnsafeCastFinding)
  )

  const typeAssertionAny = pipe(
    Option.liftPredicate(ts.isTypeAssertionExpression)(node),
    Option.filter(typeAssertionHasAnyType),
    Option.map(typeAssertionUnsafeCastFinding)
  )

  return pipe(Array.make(asAny, typeAssertionAny), Array.flatMap(Option.toArray))
}

const isTypeScriptNamespace = (node: ts.ModuleDeclaration) => {
  const hasIdentifierName = ts.isIdentifier(node.name)
  const isGlobalAugmentation = (node.flags & ts.NodeFlags.GlobalAugmentation) !== 0
  const checks = Array.make(hasIdentifierName, !isGlobalAugmentation)

  return Array.every(checks, Boolean)
}

const typescriptNamespaceFindings = (
  _context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isModuleDeclaration)(node),
    Option.filter(isTypeScriptNamespace),
    Option.map((declaration) => {
      const subject = ts.isIdentifier(declaration.name)
        ? declaration.name.text
        : declaration.name.getText()

      const evidence = ts.isIdentifier(declaration.name) ? declaration.name : declaration

      return makeRuleFinding("typescript-namespaces")(subject)(evidence)
    }),
    Option.toArray
  )

const callIsConfigString = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker, call.expression, "Config", configStringNames)

const configSecretFindingFromLiteral = (literal: ts.StringLiteralLike) =>
  makeRuleFinding("config-secret-redaction")(literal.text)(literal)

const configSecretFromCall =
  (sensitiveConfigKey: (key: string) => boolean) => (call: ts.CallExpression) => {
    const literalIsSensitive = (literal: ts.StringLiteralLike) => sensitiveConfigKey(literal.text)

    return pipe(
      Array.head(call.arguments),
      Option.filter(ts.isStringLiteralLike),
      Option.filter(literalIsSensitive),
      Option.map(configSecretFindingFromLiteral)
    )
  }

const configSecretRedactionFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.filter(callIsConfigString(context.checker)),
    Option.flatMap(configSecretFromCall(index.policy.sensitiveConfigKey)),
    Option.toArray
  )

const classExtendsSchemaModel = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
  const extendsSchemaMember = (memberName: string) =>
    classExtendsEffectApi(checker, declaration, "Schema", memberName)

  return Array.some(schemaClassModelNames, extendsSchemaMember)
}

const classQualityFromNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(classExtendsSchemaModel(context.checker)),
    Option.map((declaration) => {
      const nameOption = Option.fromNullishOr(declaration.name)

      const subject = pipe(
        nameOption,
        Option.map(Struct.get("text")),
        Option.getOrElse(Function.constant("Schema.Class"))
      )

      const evidence = pipe(
        nameOption,
        Option.map((name): ts.Node => name),
        Option.getOrElse(Function.constant(declaration))
      )

      return makeRuleFinding("schema-class-models")(subject)(evidence)
    })
  )

const schemaClassCallArgumentShape = (argument: ts.Expression) => {
  const current = unwrapTransparentExpression(argument)
  const isFields = ts.isObjectLiteralExpression(current)
  const isIdentifier = ts.isIdentifier(current)
  const isCall = ts.isCallExpression(current)
  const structCandidates = Array.make(isIdentifier, isCall)
  const isStructSchema = Array.some(structCandidates, Boolean)
  const checks = Array.make(isFields, isStructSchema)

  return Array.some(checks, Boolean)
}

const callIsSchemaClassModel = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapCallee(call.expression)

  return importedEffectApiAt(checker, callee, "Schema", schemaClassModelNames)
}

const callHasSchemaClassArgumentShape = (call: ts.CallExpression) =>
  pipe(Array.head(call.arguments), Option.exists(schemaClassCallArgumentShape))

const callQualityFromNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.filter(callIsSchemaClassModel(context.checker)),
    Option.filter(callHasSchemaClassArgumentShape),
    Option.map((call) => {
      const callee = unwrapCallee(call.expression)
      const member = importedMemberAt(context.checker, callee)
      const callText = call.expression.getText(context.sourceFile)
      const fallbackText = Function.constant(callText)

      const subject = pipe(
        member,
        Option.map(importedMemberSubject),
        Option.getOrElse(fallbackText)
      )

      return makeRuleFinding("schema-class-models")(subject)(call.expression)
    })
  )

const schemaClassModelFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const fromClass = classQualityFromNode(context)(node)
  const fromCall = callQualityFromNode(context)(node)
  const candidates = Array.make(fromClass, fromCall)

  return pipe(candidates, Array.flatMap(Option.toArray))
}

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
    const hasInterface = sourceFileHasSchemaRecordInterface(
      (declaration.name as ts.Identifier).text
    )(sourceFile)

    return !hasInterface
  }

const schemaRecordInterfaceFindingFromDeclaration = (declaration: ts.VariableDeclaration) =>
  makeRuleFinding("schema-record-interface")((declaration.name as ts.Identifier).text)(
    declaration.name as ts.Identifier
  )

const schemaRecordInterfaceFindings = (
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

const schemaOptionalKeyFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(node),
    Option.flatMap(optionalKeyFindingFromAssignment(context)),
    Option.toArray
  )

const schemaTaggedErrorNames = Array.make("TaggedErrorClass", "ErrorClass", "TaggedError")

const dataTaggedErrorNames = Array.make("TaggedError", "Error")

const errorNamePattern = /Error$|Failure$|Exception$/u

const propertyNameIsTag = strictEqual("_tag")

const propertyDeclarationIsTag = (property: ts.PropertyDeclaration) =>
  pipe(propertyNameText(property.name), Option.exists(propertyNameIsTag))

const classMemberIsTag = (member: ts.ClassElement) =>
  pipe(
    Option.liftPredicate(ts.isPropertyDeclaration)(member),
    Option.exists(propertyDeclarationIsTag)
  )

const classHasTagMember = (declaration: ts.ClassDeclaration) =>
  Array.some(declaration.members, classMemberIsTag)

const nameMatchesErrorPattern = (name: string) => errorNamePattern.test(name)

const classNameLooksLikeError = (declaration: ts.ClassDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.map(Struct.get("text")),
    Option.exists(nameMatchesErrorPattern)
  )

const identifierIsError = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Error"))

const propertyAccessIsError = (access: ts.PropertyAccessExpression) =>
  strictEqual("Error")(access.name.text)

const nodeIsErrorConstructor = (current: ts.Expression) =>
  pipe(
    EffectMatch.value(current),
    EffectMatch.when(ts.isIdentifier, identifierIsError),
    EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessIsError),
    EffectMatch.orElse(Function.constFalse)
  )

const heritageExpressionIsErrorConstructor = flow(
  unwrapTransparentExpression,
  unwrapCallee,
  nodeIsErrorConstructor
)

const heritageTypeIsErrorConstructor = (heritage: ts.ExpressionWithTypeArguments) =>
  heritageExpressionIsErrorConstructor(heritage.expression)

const classExtendsBuiltinError = (declaration: ts.ClassDeclaration) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses

  return Array.some(clauses, (clause) => {
    const isExtends = heritageClauseIsExtends(clause)
    const extendsError = Array.some(clause.types, heritageTypeIsErrorConstructor)
    const checks = Array.make(isExtends, extendsError)

    return Array.every(checks, Boolean)
  })
}

const classExtendsDataTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const clauses = declaration.heritageClauses ?? emptyHeritageClauses

    return Array.some(clauses, (clause) => {
      const isExtends = heritageClauseIsExtends(clause)

      const extendsDataTagged = Array.some(clause.types, (heritage) => {
        const callee = unwrapCallee(heritage.expression)

        return importedEffectApiAt(checker, callee, "Data", dataTaggedErrorNames)
      })

      const checks = Array.make(isExtends, extendsDataTagged)

      return Array.every(checks, Boolean)
    })
  }

const classAlreadySchemaTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const extendsSchemaMember = (memberName: string) =>
      classExtendsEffectApi(checker, declaration, "Schema", memberName)

    return Array.some(schemaTaggedErrorNames, extendsSchemaMember)
  }

const classLooksLikeHandRolledError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const tagged = classHasTagMember(declaration)
    const dataTagged = classExtendsDataTaggedError(checker)(declaration)
    const errorHeritage = classExtendsBuiltinError(declaration)
    const errorName = classNameLooksLikeError(declaration)
    const errorLikeCandidates = Array.make(errorHeritage, errorName, dataTagged)
    const errorLike = Array.some(errorLikeCandidates, Boolean)
    const handRolledCandidates = Array.make(tagged, dataTagged)
    const handRolled = Array.some(handRolledCandidates, Boolean)
    const checks = Array.make(handRolled, errorLike)

    return Array.every(checks, Boolean)
  }

const classDeclarationHasName = flow(classDeclarationName, Option.isSome)

const schemaErrorClassFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(classDeclarationHasName),
    Option.filter(Predicate.not(classAlreadySchemaTaggedError(context.checker))),
    Option.filter(classLooksLikeHandRolledError(context.checker)),
    Option.map((declaration) => {
      const nameOption = Option.fromNullishOr(declaration.name)

      const evidence = pipe(
        nameOption,
        Option.map((name): ts.Node => name),
        Option.getOrElse(Function.constant(declaration))
      )

      const subject = pipe(
        nameOption,
        Option.map(Struct.get("text")),
        Option.getOrElse(Function.constant("Error"))
      )

      return makeRuleFinding("schema-error-class")(subject)(evidence)
    }),
    Option.toArray
  )

const effectGenNames = Array.of("gen")

const callIsEffectGen = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker, call.expression, "Effect", effectGenNames)

const isEffectGenCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.exists(callIsEffectGen(checker))
  )

const returnExpressionFromBlock = (block: ts.Block) =>
  pipe(
    Array.fromIterable(block.statements),
    Array.findFirst(ts.isReturnStatement),
    Option.flatMap(returnStatementExpression)
  )

const returnedExpressionOfFunction = (declaration: ts.ArrowFunction | ts.FunctionExpression) =>
  pipe(
    EffectMatch.value(declaration.body),
    EffectMatch.when(ts.isBlock, returnExpressionFromBlock),
    EffectMatch.orElse(Option.some as (expression: ts.Expression) => Option.Option<ts.Expression>)
  )

const isPreferEffectFnOverlapShape =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
    pipe(
      functionInitializer(declaration),
      Option.filter(hasParameters),
      Option.filter(functionLikeReturnsEffect(checker)),
      Option.flatMap(returnedExpressionOfFunction),
      Option.exists(isEffectGenCall(checker))
    )

const variableStatementIsExported =
  (node: ts.VariableDeclaration) => (statement: ts.VariableStatement) => {
    const hasExport = hasExportModifier(statement)
    const isTopLevelExport = isTopLevelExportedDeclaration(node)
    const checks = Array.make(hasExport, isTopLevelExport)

    return Array.some(checks, Boolean)
  }

const exportedVariableDeclaration = (node: ts.VariableDeclaration) =>
  pipe(
    node.parent,
    Option.liftPredicate(ts.isVariableDeclarationList),
    Option.map(Struct.get("parent")),
    Option.filter(ts.isVariableStatement),
    Option.filter(variableStatementIsExported(node)),
    Option.as(node)
  )

const variableInitializerNeedsEffectFn =
  (checker: ts.TypeChecker) => (initializer: ts.Expression) => {
    const current = unwrapTransparentExpression(initializer)
    const isFunction = isFunctionInitializer(current)
    const effectFnInspection = inspectEffectFnCall(checker)(current)
    const isEffectFn = Option.isSome(effectFnInspection)
    const expressionReturnsEffect = expressionTypeIsEffectReturning(checker)(current)
    const functionReturnsEffect = isFunction && functionLikeReturnsEffect(checker)(current)
    const returnsEffectChecks = Array.make(expressionReturnsEffect, functionReturnsEffect)
    const returnsEffect = Array.some(returnsEffectChecks, Boolean)
    const named = initializerIsNamedEffectFn(checker)(current)
    const shouldInspectChecks = Array.make(returnsEffect, isEffectFn)
    const shouldInspect = Array.some(shouldInspectChecks, Boolean)
    const notNamed = !named
    const reportChecks = Array.make(shouldInspect, notNamed)

    return Array.every(reportChecks, Boolean)
  }

const qualityFindingFromVariableName = (name: ts.Identifier) =>
  serviceMethodFinding(name.text)(name)

const bindingNameAsIdentifier = (name: ts.BindingName) => name as ts.Identifier

const qualityFindingFromVariableDeclaration = flow(
  Struct.get<ts.VariableDeclaration, "name">("name"),
  bindingNameAsIdentifier,
  qualityFindingFromVariableName
)

const qualityFromVariableDeclaration =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
    pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.filter(variableInitializerNeedsEffectFn(checker)),
      Option.map(() => qualityFindingFromVariableDeclaration(declaration))
    )

const qualityFromVariableNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.flatMap(exportedVariableDeclaration),
    Option.filter(Predicate.not(isPreferEffectFnOverlapShape(context.checker))),
    Option.filter(variableDeclarationNameIsIdentifier),
    Option.flatMap(qualityFromVariableDeclaration(context.checker))
  )

const functionDeclarationHasName = flow(functionDeclarationName, Option.isSome)

const functionDeclarationIsExported = (declaration: ts.FunctionDeclaration) => {
  const hasExport = hasExportModifier(declaration)
  const isTopLevelExport = isTopLevelExportedDeclaration(declaration)
  const checks = Array.make(hasExport, isTopLevelExport)

  return Array.some(checks, Boolean)
}

const identifierNodeFromName = (name: ts.Identifier): ts.Node => name

const evidenceFromFunctionDeclaration = (declaration: ts.FunctionDeclaration) =>
  pipe(
    functionDeclarationName(declaration),
    Option.map(identifierNodeFromName),
    Option.getOrElse(Function.constant(declaration))
  )

const subjectFromFunctionDeclaration = (declaration: ts.FunctionDeclaration) =>
  pipe(
    functionDeclarationName(declaration),
    Option.map(Struct.get("text")),
    Option.getOrElse(Function.constant("function"))
  )

const qualityFindingFromFunctionDeclaration = (declaration: ts.FunctionDeclaration) => {
  const subject = subjectFromFunctionDeclaration(declaration)
  const evidence = evidenceFromFunctionDeclaration(declaration)

  return serviceMethodFinding(subject)(evidence)
}

const qualityFromFunctionNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(node),
    Option.filter(functionDeclarationHasName),
    Option.filter(functionDeclarationIsExported),
    Option.filter(functionLikeReturnsEffect(context.checker)),
    Option.map(qualityFindingFromFunctionDeclaration)
  )

const exportedEffectFunctionFindings = (
  context: MatchContext,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const fromVariable = qualityFromVariableNode(context)(node)
  const fromFunction = qualityFromFunctionNode(context)(node)
  const candidates = Array.make(fromVariable, fromFunction)

  return pipe(candidates, Array.flatMap(Option.toArray))
}

const effectMakeNames = Array.of("make")

const effectSucceedSyncNames = Array.make("succeed", "sync")

const objectFromSucceedOrSync = (checker: ts.TypeChecker) => (initializer: ts.CallExpression) => {
  const isSucceedOrSync = importedEffectApiAt(
    checker,
    initializer.expression,
    "Effect",
    effectSucceedSyncNames
  )

  return isSucceedOrSync
    ? pipe(
        Array.head(initializer.arguments),
        Option.map(unwrapTransparentExpression),
        Option.filter(ts.isObjectLiteralExpression)
      )
    : Option.none()
}

const propertyInitializerExpression = (property: ts.PropertyAssignment) =>
  unwrapTransparentExpression(property.initializer)

const objectLiteralFromMakeInitializer =
  (checker: ts.TypeChecker) => (initializer: ts.Expression) =>
    pipe(
      EffectMatch.value(initializer),
      EffectMatch.when(
        ts.isObjectLiteralExpression,
        Option.some as (
          object: ts.ObjectLiteralExpression
        ) => Option.Option<ts.ObjectLiteralExpression>
      ),
      EffectMatch.when(ts.isCallExpression, objectFromSucceedOrSync(checker)),
      EffectMatch.orElse(Option.none as () => Option.Option<ts.ObjectLiteralExpression>)
    )

const makeObjectFromConfig = (checker: ts.TypeChecker) => (config: ts.ObjectLiteralExpression) =>
  pipe(
    propertyAssignmentNamed(config, effectMakeNames),
    Option.filter(ts.isPropertyAssignment),
    Option.map(propertyInitializerExpression),
    Option.flatMap(objectLiteralFromMakeInitializer(checker))
  )

const makeObjectFromServiceClass =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
    pipe(
      effectServiceConfigObject(checker, declaration),
      Option.flatMap(makeObjectFromConfig(checker))
    )

const propertyAssignmentMethodFinding =
  (context: MatchContext) => (serviceName: string) => (property: ts.PropertyAssignment) => {
    const methodName = propertyNameText(property.name)
    const initializer = unwrapTransparentExpression(property.initializer)
    const returnsEffect = expressionTypeIsEffectReturning(context.checker)(initializer)
    const wrapped = initializerIsNamedEffectFn(context.checker)(initializer)
    const notWrapped = !wrapped
    const shouldReportChecks = Array.make(returnsEffect, notWrapped)
    const shouldReport = Array.every(shouldReportChecks, Boolean)

    return shouldReport
      ? pipe(methodName, Option.map(serviceMethodFindingForName(serviceName)(property)))
      : Option.none()
  }

const methodDeclarationFinding =
  (context: MatchContext) => (serviceName: string) => (property: ts.MethodDeclaration) => {
    const methodName = pipe(Option.fromNullishOr(property.name), Option.flatMap(propertyNameText))
    const returnsEffect = functionLikeReturnsEffect(context.checker)(property)

    return returnsEffect
      ? pipe(methodName, Option.map(serviceMethodFindingForName(serviceName)(property)))
      : Option.none()
  }

const shorthandPropertyMethodFinding =
  (context: MatchContext) =>
  (serviceName: string) =>
  (property: ts.ShorthandPropertyAssignment) => {
    const returnsEffect = expressionTypeIsEffectReturning(context.checker)(property.name)
    const wrapped = initializerIsNamedEffectFn(context.checker)(property.name)
    const notWrapped = !wrapped
    const shouldReportChecks = Array.make(returnsEffect, notWrapped)
    const shouldReport = Array.every(shouldReportChecks, Boolean)

    if (!shouldReport) {
      return Option.none()
    }

    const subject = serviceMethodSubject(serviceName)(property.name.text)
    const finding = serviceMethodFinding(subject)(property.name)

    return Option.some(finding)
  }

const serviceMethodFindingFromProperty =
  (context: MatchContext) => (serviceName: string) => (property: ts.ObjectLiteralElementLike) =>
    pipe(
      EffectMatch.value(property),
      EffectMatch.when(
        ts.isPropertyAssignment,
        propertyAssignmentMethodFinding(context)(serviceName)
      ),
      EffectMatch.when(ts.isMethodDeclaration, methodDeclarationFinding(context)(serviceName)),
      EffectMatch.when(
        ts.isShorthandPropertyAssignment,
        shorthandPropertyMethodFinding(context)(serviceName)
      ),
      EffectMatch.orElse(Option.none as () => Option.Option<EffectQualityRuleFinding>),
      Result.fromOption(Function.constVoid)
    )

const serviceMethodAssignmentFindings =
  (context: MatchContext) =>
  (serviceName: string) =>
  (object: ts.ObjectLiteralExpression): ReadonlyArray<EffectQualityRuleFinding> =>
    Array.filterMap(object.properties, serviceMethodFindingFromProperty(context)(serviceName))

const contextServiceClassName = (declaration: ts.ClassDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.map(Struct.get("text")),
    Option.getOrElse(Function.constant("Service"))
  )

const extendsContextService = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
  classExtendsEffectApi(checker, declaration, "Context", "Service")

const contextServiceFindingsFromDeclaration =
  (context: MatchContext) => (declaration: ts.ClassDeclaration) => {
    const serviceName = contextServiceClassName(declaration)
    const findingsForObject = serviceMethodAssignmentFindings(context)(serviceName)

    return pipe(
      makeObjectFromServiceClass(context.checker)(declaration),
      Option.map(findingsForObject)
    )
  }

const contextServiceFindings = (
  context: MatchContext,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(extendsContextService(context.checker)),
    Option.flatMap(contextServiceFindingsFromDeclaration(context)),
    Option.getOrElse(Function.constant(emptyRuleFindings))
  )

const serviceMethodEffectFnFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const serviceClass = contextServiceFindings(context, node)
  const exportedFunctions = exportedEffectFunctionFindings(context, node)

  return Array.appendAll(serviceClass, exportedFunctions)
}

const domainQualifiedNamePattern = /^[^.\s]+\.[^.\s]+/

const effectFnNameIsUnqualified = (name: Option.Option<string>) =>
  pipe(
    name,
    Option.match({
      onNone: Function.constTrue,
      onSome: (value) => !domainQualifiedNamePattern.test(value)
    })
  )

const inspectionNameIsUnqualified = (inspection: EffectFnNameInspection) =>
  effectFnNameIsUnqualified(inspection.name)

const effectFnNameFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.flatMap(inspectEffectFnCall(context.checker)),
    Option.filter(inspectionNameIsUnqualified),
    Option.map((inspection) => {
      const subject = pipe(inspection.name, Option.getOrElse(Function.constant("(anonymous)")))

      return makeRuleFinding("effect-fn-name")(subject)(inspection.node as ts.Node)
    }),
    Option.toArray
  )

const schemaCollectors: ReadonlyArray<
  (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ) => ReadonlyArray<EffectQualityRuleFinding>
> = Array.make(
  unsafeCastFindings,
  schemaClassModelFindings,
  typescriptNamespaceFindings,
  serviceMethodEffectFnFindings,
  effectFnNameFindings,
  schemaRecordInterfaceFindings,
  schemaOptionalKeyFindings,
  schemaErrorClassFindings,
  configSecretRedactionFindings
)

const schemaRuleFindings = collectFindings(schemaCollectors)

const processEnvironmentFinding = makeRuleFinding("process-environment")

const globalConfigMutationFinding = makeRuleFinding("global-config-mutation")

const isRootOrTest = (role: ArchitectureRole) => {
  const root = isRootRole(role)
  const test = isTestRole(role)

  return root || test
}

const isNonRootOrTest = Predicate.not(isRootOrTest)

const processEnvironmentSubject = (context: MatchContext, node: ts.Node) =>
  pipe(
    Option.liftPredicate(isAccessExpression)(node),
    Option.filter(isProcessEnvironmentAccess(context.checker)),
    Option.filter(isOutermostAccess),
    Option.as("process.env")
  )

const processEnvironmentFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    roleForSourceFile(index, context.sourceFile),
    Option.filter(isNonRootOrTest),
    Option.flatMap(() => processEnvironmentSubject(context, node)),
    Option.map(Function.flip(processEnvironmentFinding)(node)),
    Option.toArray
  )

const deleteExpressionTarget = (expression: ts.DeleteExpression) =>
  Option.some(expression.expression)

const assignmentTarget = (node: ts.Node) =>
  pipe(
    EffectMatch.value(node),
    EffectMatch.when(ts.isBinaryExpression, binaryAssignmentTarget),
    EffectMatch.when(ts.isDeleteExpression, deleteExpressionTarget),
    EffectMatch.orElse(() => Option.none())
  )

const accessExpressionUnwrapped = (
  access: ts.PropertyAccessExpression | ts.ElementAccessExpression
) => unwrapTransparentExpression(access.expression)

const ambientCapabilityFromTarget =
  (context: MatchContext) =>
  (target: ts.Expression): Option.Option<string> => {
    const unwrapped = unwrapTransparentExpression(target)
    const ambientSubject = ambientCapabilitySubject(context)

    const direct = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
      Option.flatMap(ambientSubject)
    )

    const nested = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
      Option.map(accessExpressionUnwrapped),
      Option.filter(ts.isPropertyAccessExpression),
      Option.flatMap(ambientSubject)
    )

    const element = pipe(
      Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
      Option.map(accessExpressionUnwrapped),
      Option.filter(ts.isPropertyAccessExpression),
      Option.flatMap(ambientSubject)
    )

    return pipe(
      direct,
      Option.orElse(Function.constant(nested)),
      Option.orElse(Function.constant(element))
    )
  }

const globalConfigMutationFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    roleForSourceFile(index, context.sourceFile),
    Option.filter(isTestRole),
    Option.flatMap(() =>
      pipe(
        assignmentTarget(node),
        Option.flatMap(ambientCapabilityFromTarget(context)),
        Option.map(() => globalConfigMutationFinding("process.env")(node))
      )
    ),
    Option.toArray
  )

const testSleepsFinding = makeRuleFinding("test-sleeps")

const productionSleepLoopsFinding = makeRuleFinding("production-sleep-loops")

const isTrueLiteral = (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)

  return strictEqual(ts.SyntaxKind.TrueKeyword)(unwrapped.kind)
}

const isEmptyForCondition = (condition: ts.ForStatement["condition"]) =>
  pipe(Option.fromNullishOr(condition), Option.isNone)

const whileTrueMatch = (statement: ts.WhileStatement) =>
  isTrueLiteral(statement.expression) ? Option.some(statement) : Option.none()

const emptyForMatch = (statement: ts.ForStatement) =>
  isEmptyForCondition(statement.condition) ? Option.some(statement) : Option.none()

const whileTrueStatement = (node: ts.Node): Option.Option<ts.WhileStatement | ts.ForStatement> =>
  pipe(
    EffectMatch.value(node),
    EffectMatch.when(ts.isWhileStatement, whileTrueMatch),
    EffectMatch.when(ts.isForStatement, emptyForMatch),
    EffectMatch.orElse(() => Option.none())
  )

const testSleepFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    roleForSourceFile(index, context.sourceFile),
    Option.filter(isTestRole),
    Option.flatMap(() => callOrPipeStageSubject(context.checker)("Effect")(sleepNames)(node)),
    Option.map(testSleepsFinding("Effect.sleep")),
    Option.toArray
  )

const ancestorIsWhileTrue = flow(whileTrueStatement, Option.isSome)

const productionSleepLoopFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const role = roleForSourceFile(index, context.sourceFile)
  const isTest = Option.exists(role, isTestRole)
  const missingRole = Option.isNone(role)
  const skip = isTest || missingRole

  if (skip) {
    return emptyRuleFindings
  }

  const matchesSleep = effectApiCall(context.checker)("Effect")(sleepNames)
  const insideWhileTrue = hasAncestor(ancestorIsWhileTrue)

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesSleep),
    Option.filter(insideWhileTrue),
    Option.map(productionSleepLoopsFinding("Effect.sleep")),
    Option.toArray
  )
}

const retryNames = Array.of("retry")

const timesNames = Array.of("times")

const scheduleNames = Array.of("schedule")

const whileUntilNames = Array.make("while", "until")

const unboundedRetryWaiverPattern =
  /unbounded|forever-ok|allow-forever|effect-quality-allow-unbounded-retry/i

const boundedRetryScheduleFinding = makeRuleFinding("bounded-retry-schedule")

const emptyCommentRanges: ReadonlyArray<ts.CommentRange> = Array.empty()

const commentRangeText = (sourceText: string) => (range: ts.CommentRange) =>
  sourceText.slice(range.pos, range.end)

const leadingCommentText = (sourceFile: ts.SourceFile) => (node: ts.Node) => {
  const fullStart = node.getFullStart()
  const leadingRanges = ts.getLeadingCommentRanges(sourceFile.text, fullStart)
  const ranges = leadingRanges ?? emptyCommentRanges

  return pipe(ranges, Array.map(commentRangeText(sourceFile.text)), Array.join("\n"))
}

const commentsMatchUnboundedWaiver = (comments: string) =>
  unboundedRetryWaiverPattern.test(comments)

const hasUnboundedRetryWaiver = (sourceFile: ts.SourceFile) =>
  flow(leadingCommentText(sourceFile), commentsMatchUnboundedWaiver)

const timesPropertyIsBound = (property: ts.ObjectLiteralElementLike) =>
  pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(property),
    Option.map(flow(Struct.get("initializer"), unwrapTransparentExpression)),
    Option.exists((value) => {
      const asNumber = ts.isNumericLiteral(value)
      const asIdentifier = ts.isIdentifier(value)

      return asNumber || asIdentifier
    })
  )

const propertyScheduleIsBounded =
  (checker: ts.TypeChecker) => (property: ts.ObjectLiteralElementLike) =>
    ts.isPropertyAssignment(property) && scheduleExpressionIsBounded(checker)(property.initializer)

const objectRetryOptionsAreBounded =
  (checker: ts.TypeChecker) => (object: ts.ObjectLiteralExpression) => {
    const hasTimes = pipe(
      propertyAssignmentNamed(object, timesNames),
      Option.exists(timesPropertyIsBound)
    )

    const hasWhileUntil = pipe(propertyAssignmentNamed(object, whileUntilNames), Option.isSome)
    const scheduleProperty = propertyAssignmentNamed(object, scheduleNames)

    const scheduleBounded = pipe(
      scheduleProperty,
      Option.map(propertyScheduleIsBounded(checker)),
      Option.getOrElse(Function.constant(false))
    )

    const hasSchedule = Option.isSome(scheduleProperty)
    const scheduleMissingBound = strictEqual(false)(scheduleBounded)
    const unboundedSchedule = hasSchedule && scheduleMissingBound
    const lacksTimes = strictEqual(false)(hasTimes)
    const lacksWhileUntil = strictEqual(false)(hasWhileUntil)
    const lacksBound = lacksTimes && lacksWhileUntil
    const unboundedAndUnbound = unboundedSchedule && lacksBound
    const timesOrWhile = hasTimes || hasWhileUntil
    const scheduleAbsent = strictEqual(false)(hasSchedule)
    const boundedOrAbsentSchedule = scheduleBounded || scheduleAbsent
    const explicitlyBounded = timesOrWhile || boundedOrAbsentSchedule
    const notUnboundedCombo = strictEqual(false)(unboundedAndUnbound)
    const boundedFlags = Array.make(notUnboundedCombo, explicitlyBounded)

    return Array.every(boundedFlags, Boolean)
  }

const retryOptionsAreBounded = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(objectLiteralArgument(expression), Option.exists(objectRetryOptionsAreBounded(checker)))

const expressionIsObjectLiteral = flow(unwrapTransparentExpression, ts.isObjectLiteralExpression)

const expressionIsFunctionLike = flow(unwrapTransparentExpression, isFunctionLikeExpression)

const retryPolicyExpression = (call: ts.CallExpression) => {
  const first = callArgumentAt(0)(call)
  const second = callArgumentAt(1)(call)
  const firstIsOptions = pipe(first, Option.exists(expressionIsObjectLiteral))
  const firstIsHandler = pipe(first, Option.exists(expressionIsFunctionLike))

  if (firstIsOptions) {
    return first
  }

  if (Option.isSome(second)) {
    return second
  }

  return firstIsHandler ? Option.none() : first
}

const retryPolicyIsUnbounded = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)
  const asObject = ts.isObjectLiteralExpression(unwrapped)
  const optionsBounded = asObject ? retryOptionsAreBounded(checker)(unwrapped) : true
  const optionsMissingBound = strictEqual(false)(optionsBounded)
  const optionsUnbounded = asObject && optionsMissingBound
  const scheduleBounded = asObject ? true : scheduleExpressionIsBounded(checker)(unwrapped)
  const scheduleMissingBound = strictEqual(false)(scheduleBounded)
  const notObject = strictEqual(false)(asObject)
  const scheduleUnbounded = notObject && scheduleMissingBound

  return optionsUnbounded || scheduleUnbounded
}

const unboundedRetryFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    retryPolicyExpression(call),
    Option.filter(retryPolicyIsUnbounded(checker)),
    Option.map(() => boundedRetryScheduleFinding("Effect.retry")(call))
  )

const boundedRetryScheduleFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesRetry = effectApiCall(context.checker)("Effect")(retryNames)
  const lacksWaiver = flow(hasUnboundedRetryWaiver(context.sourceFile), strictEqual(false))

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesRetry),
    Option.filter(lacksWaiver),
    Option.flatMap(unboundedRetryFinding(context.checker)),
    Option.toArray
  )
}

const runCollectNames = Array.of("runCollect")

const bufferNames = Array.of("buffer")

const capacityNames = Array.of("capacity")

const unboundedStreamCollectFinding = makeRuleFinding("unbounded-stream-collect")

const unboundedStreamBufferFinding = makeRuleFinding("unbounded-stream-buffer")

const isNonTestRole = Predicate.not(isTestRole)

const stringLiteralText = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isStringLiteralLike),
  Option.map(Struct.get("text"))
)

const unboundedStreamCollectFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    roleForSourceFile(index, context.sourceFile),
    Option.filter(isNonTestRole),
    Option.flatMap(() => callOrPipeStageSubject(context.checker)("Stream")(runCollectNames)(node)),
    Option.map(unboundedStreamCollectFinding("Stream.runCollect")),
    Option.toArray
  )

const capacityPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
  pipe(propertyAssignmentNamed(object, capacityNames), Option.filter(ts.isPropertyAssignment))

const bufferCapacityIsUnbounded = (expression: ts.Expression) =>
  pipe(
    objectLiteralArgument(expression),
    Option.flatMap(capacityPropertyAssignment),
    Option.map(Struct.get("initializer")),
    Option.flatMap(stringLiteralText),
    Option.contains("unbounded")
  )

const unboundedBufferOptions = (call: ts.CallExpression) => {
  const direct = pipe(callArgumentAt(0)(call), Option.exists(bufferCapacityIsUnbounded))
  const dataFirst = pipe(callArgumentAt(1)(call), Option.exists(bufferCapacityIsUnbounded))

  return direct || dataFirst
}

const unboundedStreamBufferFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesBuffer = effectApiCall(context.checker)("Stream")(bufferNames)

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesBuffer),
    Option.filter(unboundedBufferOptions),
    Option.map(unboundedStreamBufferFinding('Stream.buffer({ capacity: "unbounded" })')),
    Option.toArray
  )
}

const handrolledTtlCacheFinding = makeRuleFinding("handrolled-ttl-cache")

const inflightDedupeMapFinding = makeRuleFinding("inflight-dedupe-map")

const sourceLooksLikeHandrolledTtlCache = (sourceText: string) => {
  const hasExpires = /\bexpires(?:At|On|In)?\b/u.test(sourceText)
  const hasDateNow = sourceText.includes("Date.now")
  const hasDelete = sourceText.includes(".delete(")
  const hasExpiryAndClock = hasExpires && hasDateNow

  return hasExpiryAndClock && hasDelete
}

const handrolledTtlCacheFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    newMapExpression(node),
    Option.filter(() => sourceLooksLikeHandrolledTtlCache(context.sourceFile.text)),
    Option.map(handrolledTtlCacheFinding("Map")),
    Option.toArray
  )

const variableMapValueLooksPending =
  (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
    const mentions = typeMentionsConstructor(context.checker)

    const annotated = pipe(
      Option.fromNullishOr(declaration.type),
      Option.map((typeNode) => context.checker.getTypeFromTypeNode(typeNode)),
      Option.exists((type) => {
        const asPromise = mentions("Promise")(type)
        const asEffect = mentions("Effect")(type)

        return asPromise || asEffect
      })
    )

    const fromInitializer = pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.filter(ts.isNewExpression),
      Option.exists(mapValueLooksPending(context))
    )

    return annotated || fromInitializer
  }

const initializerIsNewMap = (declaration: ts.VariableDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.initializer),
    Option.flatMap(newMapExpression),
    Option.isSome
  )

const inflightDedupeMapFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const fromNew = pipe(
    newMapExpression(node),
    Option.filter(mapValueLooksPending(context)),
    Option.map(inflightDedupeMapFinding("Map"))
  )

  const fromVariable = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.filter(initializerIsNewMap),
    Option.filter(variableMapValueLooksPending(context)),
    Option.map(inflightDedupeMapFinding("Map"))
  )

  const candidates = Array.make(fromNew, fromVariable)

  return Array.flatMap(candidates, Option.toArray)
}

const provideNames = Array.make(
  "provide",
  "provideService",
  "provideServiceEffect",
  "provideContext"
)

const layerBuildNames = Array.of("build")

const cachePerRequestFinding = makeRuleFinding("cache-per-request")

const scopedClientCacheFinding = makeRuleFinding("scoped-client-cache")

const isModuleScopeFunction = (fn: ts.FunctionLikeDeclaration) =>
  pipe(
    EffectMatch.value(fn.parent),
    EffectMatch.when(ts.isSourceFile, Function.constTrue),
    EffectMatch.when(ts.isModuleBlock, Function.constTrue),
    EffectMatch.when(ts.isVariableDeclaration, (declaration) => {
      const statement = declaration.parent?.parent
      const isVariableStatement = ts.isVariableStatement(statement)
      const isSourceFileParent = ts.isSourceFile(statement.parent)

      return isVariableStatement && isSourceFileParent
    }),
    EffectMatch.orElse(Function.constFalse)
  )

const cacheMakeIsPerRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    enclosingFunctionLike(call),
    Option.exists((fn) => {
      const hasParameters = fn.parameters.length > 0
      const moduleScope = isModuleScopeFunction(fn)
      const nested = strictEqual(false)(moduleScope)
      const insideLookup = nestedInsideCacheLookup(checker)(call)
      const notLookup = strictEqual(false)(insideLookup)
      const hasParametersOrNested = hasParameters || nested

      return hasParametersOrNested && notLookup
    })
  )

const cachePerRequestFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesCacheMake = effectApiCall(context.checker)("Cache")(cacheMakeNames)

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesCacheMake),
    Option.filter(cacheMakeIsPerRequest(context.checker)),
    Option.map(cachePerRequestFinding("Cache.make")),
    Option.toArray
  )
}

const scopedClientCacheFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesCall = effectApiCall(context.checker)
  const call = callExpressionOf(node)
  const isProvide = pipe(call, Option.exists(matchesCall("Effect")(provideNames)))
  const isLayerBuild = pipe(call, Option.exists(matchesCall("Layer")(layerBuildNames)))
  const isLayerAcquisition = pipe(call, Option.exists(matchesCall("Layer")(layerAcquisitionNames)))
  const provideOrBuild = isProvide || isLayerBuild
  const matches = provideOrBuild || isLayerAcquisition
  const nestedInLookup = nestedInsideCacheLookup(context.checker)(node)
  const matchedNestedFlags = Array.make(matches, nestedInLookup)
  const matchedNested = Array.every(matchedNestedFlags, Boolean)
  const shouldSkip = strictEqual(false)(matchedNested)

  if (shouldSkip) {
    return emptyRuleFindings
  }

  const subject = node.getText(context.sourceFile)
  const finding = scopedClientCacheFinding(subject)(node)

  return Array.of(finding)
}

const catchCauseSelfExpression =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const callee = unwrapTransparentExpression(call.expression)

    const methodPipeSelf = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
      Option.filter(accessNameIsPipe),
      Option.map(Struct.get("expression"))
    )

    if (Option.isSome(methodPipeSelf)) {
      return methodPipeSelf
    }

    if (isPipeCall(checker)(call)) {
      return callArgumentAt(0)(call)
    }

    const dataFirst = callArgumentAt(0)(call)

    const looksLikeHandler = pipe(
      dataFirst,
      Option.exists(flow(unwrapTransparentExpression, isFunctionLikeExpression))
    )

    return looksLikeHandler ? Option.none() : dataFirst
  }

const isCatchCauseCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const matches = effectApiCall(checker)
  const effectCatch = matches("Effect")(catchCauseNames)(call)
  const streamCatch = matches("Stream")(catchCauseNames)(call)

  return effectCatch || streamCatch
}

const isCatchCauseReference = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const matches = effectApiReference(checker)
  const effectCatch = matches("Effect")(catchCauseNames)(expression)
  const streamCatch = matches("Stream")(catchCauseNames)(expression)

  return effectCatch || streamCatch
}

const callIsMethodOrFunctionPipe =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const methodPipe = ts.isPropertyAccessExpression(call.expression)
    const functionPipe = isPipeCall(checker)(call)
    const flags = Array.make(methodPipe, functionPipe)

    return Array.some(flags, Boolean)
  }

const parentIsMethodOrFunctionPipe =
  (checker: ts.TypeChecker) =>
  (parent: ts.CallExpression): boolean => {
    const parentCallee = unwrapTransparentExpression(parent.expression)

    const isMethodPipe = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(parentCallee),
      Option.exists(accessNameIsPipe)
    )

    const functionPipe = isPipeCall(checker)(parent)
    const flags = Array.make(isMethodPipe, functionPipe)

    return Array.some(flags, Boolean)
  }

const directCatchCauseFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    catchCauseSelfExpression(checker)(call),
    Option.flatMap(typedErrorFromSelf(checker)),
    Option.map(() => typedErrorRecoveryFinding("catchCause")(call))
  )

const pipeStageCatchCauseFinding = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    Option.fromNullishOr(expression.parent),
    Option.filter(ts.isCallExpression),
    Option.filter(callIsMethodOrFunctionPipe(checker)),
    Option.flatMap(pipeCallTypedErrorFinding(checker)(expression))
  )

const dataLastCatchCauseFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    Option.fromNullishOr(call.parent),
    Option.filter(ts.isCallExpression),
    Option.filter(parentIsMethodOrFunctionPipe(checker)),
    Option.flatMap(pipeCallTypedErrorFinding(checker)(call))
  )

const typedErrorRecoveryFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const catchCall = pipe(callExpressionOf(node), Option.filter(isCatchCauseCall(context.checker)))
  const fromDirect = pipe(catchCall, Option.flatMap(directCatchCauseFinding(context.checker)))

  const fromPipeStage = pipe(
    Option.liftPredicate(isExpressionReferenceNode)(node),
    Option.filter(isCatchCauseReference(context.checker)),
    Option.flatMap(pipeStageCatchCauseFinding(context.checker))
  )

  // Data-last catchCause stages need the outer pipe receiver because the call is the stage itself.
  const fromDataLastStage = pipe(
    callExpressionOf(node),
    Option.filter(isCatchCauseCall(context.checker)),
    Option.flatMap(dataLastCatchCauseFinding(context.checker))
  )

  const findings = Array.make(fromDirect, fromPipeStage, fromDataLastStage)

  return pipe(
    findings,
    Array.flatMap(Option.toArray),
    Array.dedupeWith((left, right) => {
      const sameNode = strictEqual(right.node)(left.node)
      const sameKind = strictEqual(right.kind)(left.kind)
      const flags = Array.make(sameNode, sameKind)

      return Array.every(flags, Boolean)
    })
  )
}

const foreverNames = Array.of("forever")

const forkScopedNames = Array.of("forkScoped")

const streamRunNames = Array.make("runCollect", "runDrain", "runForEach", "runFold", "runFoldWhile")

const layerForeverAcquisitionFinding = makeRuleFinding("layer-forever-acquisition")

const expressionContainsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const onCall = effectApiCall(checker)(namespace)(names)
    const onReference = effectApiReference(checker)(namespace)(names)

    const visitNode = (current: ts.Node) =>
      pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isCallExpression, onCall),
        EffectMatch.when(isExpressionReferenceNode, onReference),
        EffectMatch.orElse(Function.constFalse)
      )

    const step = (found: boolean, current: ts.Node) => (found ? true : visitNode(current))

    return foldAst(step)(expression)(false)
  }

const lastImportedMemberPath = (value: ImportedMember) => Array.last(value.path)

const layerAcquisitionEffectArgument =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const matchesAcquisition = effectApiCall(checker)("Layer")(layerAcquisitionNames)

    if (!matchesAcquisition(call)) {
      return Option.none()
    }

    const callee = unwrapCallee(call.expression)
    const member = importedMemberAt(checker, callee)
    const calleeMember = pipe(member, Option.flatMap(lastImportedMemberPath))
    const isEffectDual = Option.contains(calleeMember, "effect")

    if (isEffectDual) {
      return call.arguments.length >= 2 ? callArgumentAt(1)(call) : callArgumentAt(0)(call)
    }

    return callArgumentAt(0)(call)
  }

const acquisitionIsUnforkedForever = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const contains = expressionContainsEffectApi(checker)
  const hasFork = contains("Effect")(forkScopedNames)(expression)
  const lacksFork = !hasFork
  const hasForever = contains("Effect")(foreverNames)(expression)
  const hasStreamForever = contains("Stream")(foreverNames)(expression)
  const hasStreamRun = contains("Stream")(streamRunNames)(expression)
  const foreverStreamRun = hasStreamForever && hasStreamRun
  const hasForeverLike = hasForever || foreverStreamRun

  return lacksFork && hasForeverLike
}

const layerForeverFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    layerAcquisitionEffectArgument(checker)(call),
    Option.filter(acquisitionIsUnforkedForever(checker)),
    Option.map(() => layerForeverAcquisitionFinding("Layer.effect")(call))
  )

const layerForeverAcquisitionFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(callExpressionOf(node), Option.flatMap(layerForeverFinding(context.checker)), Option.toArray)

const runtimeCollectors: ReadonlyArray<
  (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ) => ReadonlyArray<EffectQualityRuleFinding>
> = Array.make(
  processEnvironmentFindings,
  testSleepFindings,
  productionSleepLoopFindings,
  unboundedStreamCollectFindings,
  unboundedStreamBufferFindings,
  handrolledTtlCacheFindings,
  inflightDedupeMapFindings,
  cachePerRequestFindings,
  scopedClientCacheFindings,
  typedErrorRecoveryFindings,
  layerForeverAcquisitionFindings,
  globalConfigMutationFindings,
  boundedRetryScheduleFindings
)

const runtimeRuleFindings = collectFindings(runtimeCollectors)

const tryPromiseNames = Array.of("tryPromise")

const tryPropertyNames = Array.of("try")

const signalPropertyNames = Array.of("signal")

const rawFetchFinding = makeRuleFinding("raw-fetch-abort-signal")

const tryPromiseBody = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const isTryPromise = importedEffectApiAt(checker, call.expression, "Effect", tryPromiseNames)

  if (!isTryPromise) {
    return Option.none()
  }

  return pipe(
    Array.head(call.arguments),
    Option.map(unwrapTransparentExpression),
    Option.flatMap((current) => {
      const asFunction = Option.liftPredicate(isFunctionInitializer)(current)

      const tryAssignmentFromObject = (object: ts.ObjectLiteralExpression) =>
        pipe(
          propertyAssignmentNamed(object, tryPropertyNames),
          Option.filter(ts.isPropertyAssignment)
        )

      const fromObject = pipe(
        Option.liftPredicate(ts.isObjectLiteralExpression)(current),
        Option.flatMap(tryAssignmentFromObject),
        Option.map(Struct.get("initializer")),
        Option.map(unwrapTransparentExpression),
        Option.filter(isFunctionInitializer)
      )

      return pipe(asFunction, Option.orElse(Function.constant(fromObject)))
    })
  )
}

const shorthandPropertyPassesSignal =
  (signalName: string) => (property: ts.ObjectLiteralElementLike) =>
    pipe(
      Option.liftPredicate(ts.isShorthandPropertyAssignment)(property),
      Option.exists((shorthand) => {
        const namedSignal = strictEqual("signal")(shorthand.name.text)
        const signalParamIsSignal = strictEqual("signal")(signalName)
        const flags = Array.make(namedSignal, signalParamIsSignal)

        return Array.every(flags, Boolean)
      })
    )

const spreadPassesSignal =
  (signalName: string) =>
  (property: ts.ObjectLiteralElementLike): boolean =>
    pipe(
      Option.liftPredicate(ts.isSpreadAssignment)(property),
      Option.exists((spreadAssignment) => {
        const spread = unwrapTransparentExpression(spreadAssignment.expression)
        const nestedObject = Option.liftPredicate(ts.isObjectLiteralExpression)(spread)

        return pipe(
          nestedObject,
          Option.map(objectPassesSignal(signalName)),
          Option.getOrElse(() => expressionReferencesName(signalName)(spreadAssignment.expression))
        )
      })
    )

const objectPassesSignal =
  (signalName: string) =>
  (object: ts.ObjectLiteralExpression): boolean => {
    const assignmentInitializerReferencesSignal = (assignment: ts.ObjectLiteralElementLike) =>
      ts.isPropertyAssignment(assignment) &&
      expressionReferencesName(signalName)(assignment.initializer)

    const direct = pipe(
      propertyAssignmentNamed(object, signalPropertyNames),
      Option.exists(assignmentInitializerReferencesSignal)
    )

    const shorthand = Array.some(object.properties, shorthandPropertyPassesSignal(signalName))
    const spread = Array.some(object.properties, spreadPassesSignal(signalName))
    const flags = Array.make(direct, shorthand, spread)

    return Array.some(flags, Boolean)
  }

const initPassesSignal = (signalName: string) => (init: ts.Expression) =>
  pipe(
    Option.liftPredicate(ts.isObjectLiteralExpression)(init),
    Option.map(objectPassesSignal(signalName)),
    Option.getOrElse(() => expressionReferencesName(signalName)(init))
  )

const fetchInitPassesSignal = (signalName: string) => (call: ts.CallExpression) =>
  pipe(
    Option.fromNullishOr(call.arguments[1]),
    Option.map(unwrapTransparentExpression),
    Option.exists(initPassesSignal(signalName))
  )

const fetchPassesSignal = (signalName: string) => (found: boolean, current: ts.Node) => {
  const asCall = callExpressionOf(current)

  const passes = pipe(
    asCall,
    Option.filter(callIsFetch),
    Option.exists(fetchInitPassesSignal(signalName))
  )

  return found || passes
}

const containsFetch = (found: boolean, current: ts.Node) => {
  const asCall = callExpressionOf(current)
  const isFetch = Option.exists(asCall, callIsFetch)

  return found || isFetch
}

const callbackContainsFetch = Function.flip(foldAst(containsFetch))(false)

const callbackPassesSignalToFetch = (signalName: string) => {
  const scan = Function.flip(foldAst(fetchPassesSignal(signalName)))(false)

  return scan
}

const signalMissingOnFetch =
  (callback: ts.ArrowFunction | ts.FunctionExpression) => (signalName: string) => {
    const passes = callbackPassesSignalToFetch(signalName)(callback)

    return !passes
  }

const findingsForMissingSignal =
  (call: ts.CallExpression) => (callback: ts.ArrowFunction | ts.FunctionExpression) => {
    const subject = pipe(
      signalParameterName(callback),
      Option.getOrElse(Function.constant("fetch"))
    )

    const finding = rawFetchFinding(subject)(call)

    return Array.of(finding)
  }

const rawFetchAbortFindings = (context: MatchContext) => (node: ts.Node) => {
  const callbackMissingSignalOnFetch = (callback: ts.ArrowFunction | ts.FunctionExpression) =>
    pipe(
      signalParameterName(callback),
      Option.match({
        onNone: Function.constTrue,
        onSome: signalMissingOnFetch(callback)
      })
    )

  const findingsFromTryPromiseCall = (call: ts.CallExpression) =>
    pipe(
      tryPromiseBody(context.checker)(call),
      Option.filter(callbackContainsFetch),
      Option.filter(callbackMissingSignalOnFetch),
      Option.map(findingsForMissingSignal(call))
    )

  return pipe(
    callExpressionOf(node),
    Option.flatMap(findingsFromTryPromiseCall),
    Option.getOrElse(Function.constant(emptyRuleFindings))
  )
}

const responseValidationFinding = makeRuleFinding("http-response-validation")

const isSchemaOrHttpResponseValidation = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const schemaDecode = callIsSchemaDecode(checker)(call)
  const httpSchema = callIsHttpResponseSchema(checker)(call)
  const flags = Array.make(schemaDecode, httpSchema)

  return Array.some(flags, Boolean)
}

const callIsArgumentOfValidation =
  (validates: (call: ts.CallExpression) => boolean) =>
  (call: ts.CallExpression) =>
  (candidate: ts.CallExpression) => {
    const argumentEqualsCall = strictEqual(call)
    const isArgument = Array.some(candidate.arguments, argumentEqualsCall)
    const isValidation = validates(candidate)
    const flags = Array.make(isArgument, isValidation)

    return Array.every(flags, Boolean)
  }

const nodeIsValidationCall =
  (validates: (call: ts.CallExpression) => boolean) => (current: ts.Node) => {
    const asCall = callExpressionOf(current)

    return Option.exists(asCall, validates)
  }

// Parent decode form is valid because Schema.decodeUnknown(response.json()) nests the body read.
const responseBodyHasNearbyValidation = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const parentCall = callExpressionOf(call.parent)
  const validates = isSchemaOrHttpResponseValidation(checker)
  const directParentValidation = Option.exists(parentCall, validates)

  const argumentOfValidation = Option.exists(
    parentCall,
    callIsArgumentOfValidation(validates)(call)
  )

  // Function-scope decode is enough because yield* response.json() may decode later in the body.
  const validationInBody = nodeIsValidationCall(validates)
  const bodyContainsValidation = functionBodyContains(validationInBody)
  const functionBodyOf = (fn: ts.FunctionLikeDeclaration) => Option.fromNullishOr(fn.body)

  const functionScopeValidation = pipe(
    enclosingFunctionLike(call),
    Option.flatMap(functionBodyOf),
    Option.exists(bodyContainsValidation)
  )

  const flags = Array.make(directParentValidation, argumentOfValidation, functionScopeValidation)

  return Array.some(flags, Boolean)
}

const findingsForUnvalidatedResponse = flow(responseValidationFinding("response.json"), Array.of)

const httpResponseValidationFindings =
  (context: MatchContext) => (index: EffectQualityIndex) => (node: ts.Node) => {
    const adapterSource = sourceHasAdapterRole(index)(context.sourceFile)

    if (!adapterSource) {
      return emptyRuleFindings
    }

    const hasNearbyValidation = responseBodyHasNearbyValidation(context.checker)
    const isHttpSchema = callIsHttpResponseSchema(context.checker)
    const isSchemaDecode = callIsSchemaDecode(context.checker)

    return pipe(
      callExpressionOf(node),
      Option.filter(callIsResponseJson),
      Option.filter(Predicate.not(hasNearbyValidation)),
      Option.filter(Predicate.not(isHttpSchema)),
      Option.filter(Predicate.not(isSchemaDecode)),
      Option.map(findingsForUnvalidatedResponse),
      Option.getOrElse(Function.constant(emptyRuleFindings))
    )
  }

const memberSubject = (member: ImportedMember) => {
  const path = Array.join(member.path, ".")

  return strictEqual(0)(path.length) ? member.moduleSpecifier : `${member.moduleSpecifier}:${path}`
}

const propertyAccessIsHttpClientRequest = (access: ts.PropertyAccessExpression) =>
  Array.contains(httpClientRequestNames, access.name.text)

const callIsHttpClientRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const importedPredicate = memberIsHttpNamespaceApi(httpClientRequestNames)
  const importedLookup = callIsImportedApi(importedPredicate)(checker)
  const imported = importedLookup(call.expression)
  const callee = unwrapTransparentExpression(call.expression)
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)
  const propertyNamed = pipe(propertyAccess, Option.exists(propertyAccessIsHttpClientRequest))
  const flags = Array.make(imported, propertyNamed)

  return Array.some(flags, Boolean)
}

const binaryAccessesStatus = (binary: ts.BinaryExpression) => {
  const left = expressionAccessesStatus(binary.left)
  const right = expressionAccessesStatus(binary.right)
  const flags = Array.make(left, right)

  return Array.some(flags, Boolean)
}

const propertyAccessIsStatus = (access: ts.PropertyAccessExpression) =>
  Array.contains(statusPropertyNames, access.name.text)

const ifStatementAccessesStatus = (statement: ts.IfStatement) =>
  expressionAccessesStatus(statement.expression)

const conditionalAccessesStatus = (conditional: ts.ConditionalExpression) =>
  expressionAccessesStatus(conditional.condition)

const nodeClassifiesStatus =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): boolean => {
    const isStatusClassify = callIsImportedApi(memberIsHttpNamespaceApi(httpStatusClassifyNames))(
      checker
    )

    const callExpressionIsStatusClassify = (call: ts.CallExpression) =>
      isStatusClassify(call.expression)

    return pipe(
      EffectMatch.value(node),
      EffectMatch.when(ts.isCallExpression, callExpressionIsStatusClassify),
      EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessIsStatus),
      EffectMatch.when(ts.isBinaryExpression, binaryAccessesStatus),
      EffectMatch.when(ts.isIfStatement, ifStatementAccessesStatus),
      EffectMatch.when(ts.isConditionalExpression, conditionalAccessesStatus),
      EffectMatch.orElse(Function.constFalse)
    )
  }

const walkBodyStatus =
  (classify: (node: ts.Node) => boolean) =>
  (bodyRead: ts.CallExpression) =>
  (state: BodyStatusWalk, current: ts.Node): BodyStatusWalk => {
    if (state.sawBodyRead) {
      return state
    }

    if (strictEqual(bodyRead)(current)) {
      return BodyStatusWalk.make({
        sawBodyRead: true,
        sawStatusBefore: state.sawStatusBefore
      })
    }

    if (classify(current)) {
      return BodyStatusWalk.make({
        sawBodyRead: false,
        sawStatusBefore: true
      })
    }

    return state
  }

const bodyReadPrecedesStatus =
  (checker: ts.TypeChecker) => (bodyRead: ts.CallExpression) => (body: ts.ConciseBody) => {
    const classify = nodeClassifiesStatus(checker)
    const step = walkBodyStatus(classify)(bodyRead)

    const initial = BodyStatusWalk.make({
      sawBodyRead: false,
      sawStatusBefore: false
    })

    const result = foldAst(step)(body)(initial)
    const noStatusBefore = !result.sawStatusBefore
    const flags = Array.make(result.sawBodyRead, noStatusBefore)

    return Array.every(flags, Boolean)
  }

const callLooksHttpRelated =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const isStatusClassify = callIsImportedApi(memberIsHttpNamespaceApi(httpStatusClassifyNames))(
      checker
    )

    const clientRequest = callIsHttpClientRequest(checker)(call)
    const statusClassify = isStatusClassify(call.expression)
    const bodyRead = callIsResponseBodyRead(call)
    const flags = Array.make(clientRequest, statusClassify, bodyRead)

    return Array.some(flags, Boolean)
  }

const nodeIsHttpRelatedCall = (checker: ts.TypeChecker) => (current: ts.Node) => {
  const asCall = callExpressionOf(current)

  return Option.exists(asCall, callLooksHttpRelated(checker))
}

const isBodyDecodeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const bodyRead = callIsResponseBodyRead(call)
  const schemaDecode = callIsSchemaDecode(checker)(call)
  const httpSchema = callIsHttpResponseSchema(checker)(call)
  const flags = Array.make(bodyRead, schemaDecode, httpSchema)

  return Array.some(flags, Boolean)
}

const statusDecodeOrderFinding = makeRuleFinding("http-status-decode-order")

const bodyLooksHttpRelated = (checker: ts.TypeChecker) => (node: ts.CallExpression) => {
  const rawBody = callIsResponseBodyRead(node)
  const httpSchema = callIsHttpResponseSchema(checker)(node)
  const schemaDecode = callIsSchemaDecode(checker)(node)
  const relatedCall = nodeIsHttpRelatedCall(checker)
  const bodyContainsRelated = functionBodyContains(relatedCall)

  const hasHttpClient = pipe(
    enclosingFunctionLike(node),
    Option.flatMap(functionBodyOf),
    Option.exists(bodyContainsRelated)
  )

  const schemaWithHttpFlags = Array.make(schemaDecode, hasHttpClient)
  const schemaWithHttp = Array.every(schemaWithHttpFlags, Boolean)
  const flags = Array.make(rawBody, httpSchema, schemaWithHttp)

  return Array.some(flags, Boolean)
}

const bodyReadSubject = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const access = Option.liftPredicate(ts.isPropertyAccessExpression)(expression)

  return pipe(
    access,
    Option.map((property) => `response.${property.name.text}`),
    Option.getOrElse(Function.constant("response body"))
  )
}

const importedDecodeSubject = (context: MatchContext) => (node: ts.CallExpression) => {
  const callee = unwrapCallee(node.expression)
  const member = importedMemberAt(context.checker, callee)

  return pipe(
    member,
    Option.map(memberSubject),
    Option.getOrElse(Function.constant("response decode"))
  )
}

const statusDecodeSubject = (context: MatchContext) => (node: ts.CallExpression) =>
  callIsResponseBodyRead(node) ? bodyReadSubject(node) : importedDecodeSubject(context)(node)

// schemaBodyJson already classifies status first because matchStatus wrappers own that order.
const bodyReadPrecedesInFunction =
  (precedesStatus: (call: ts.CallExpression) => (body: ts.ConciseBody) => boolean) =>
  (call: ts.CallExpression) =>
    pipe(
      enclosingFunctionLike(call),
      Option.flatMap(functionBodyOf),
      Option.exists(precedesStatus(call))
    )

const findingsForCall =
  (subjectOf: (call: ts.CallExpression) => string) => (call: ts.CallExpression) => {
    const subject = subjectOf(call)
    const finding = statusDecodeOrderFinding(subject)(call)

    return Array.of(finding)
  }

const httpStatusDecodeOrderFindings =
  (context: MatchContext) => (index: EffectQualityIndex) => (node: ts.Node) => {
    const adapterSource = sourceHasAdapterRole(index)(context.sourceFile)

    if (!adapterSource) {
      return emptyRuleFindings
    }

    const isBodyDecode = isBodyDecodeCall(context.checker)
    const precedesStatus = bodyReadPrecedesStatus(context.checker)
    const looksHttpRelated = bodyLooksHttpRelated(context.checker)
    const subjectOf = statusDecodeSubject(context)
    const precedesInFunction = bodyReadPrecedesInFunction(precedesStatus)
    // Report only HTTP-looking body reads because raw response.* or HttpClient schema signal HTTP
    const toFindings = findingsForCall(subjectOf)

    return pipe(
      callExpressionOf(node),
      Option.filter(isBodyDecode),
      Option.filter(precedesInFunction),
      Option.filter(looksHttpRelated),
      Option.map(toFindings),
      Option.getOrElse(Function.constant(emptyRuleFindings))
    )
  }

const effectVitestModules = Array.make("@effect/vitest", "@effect/vitest/index")

const plainItMethods = Array.make("only", "skip", "todo", "concurrent", "sequential")

const moduleIsEffectVitest = (moduleSpecifier: string) =>
  Array.some(effectVitestModules, (candidate) => {
    const exact = strictEqual(candidate)(moduleSpecifier)
    const nested = moduleSpecifier.startsWith(`${candidate}/`)
    const flags = Array.make(exact, nested)

    return Array.some(flags, Boolean)
  })

const memberIsEffectVitestIt = (member: ImportedMember) => {
  const vitestModule = moduleIsEffectVitest(member.moduleSpecifier)
  const singlePath = strictEqual(1)(member.path.length)
  const pathHead = Array.get(member.path, 0)
  const namedIt = pipe(pathHead, Option.contains("it"))
  const flags = Array.make(vitestModule, singlePath, namedIt)

  return Array.every(flags, Boolean)
}

const expressionIsEffectVitestIt = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)
  const member = importedMemberAt(checker, unwrapped)

  return Option.exists(member, memberIsEffectVitestIt)
}

// Bare it("name", cb) is plain style because it.effect is the Effect-aware entry.
const bareItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(callee),
      Option.filter(identifierTextIsIt),
      Option.exists(isVitestIt)
    )

const propertyItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
      Option.exists((access) => {
        const root = unwrapTransparentExpression(access.expression)
        const isPlainMethod = Array.contains(plainItMethods, access.name.text)
        const rootNamedIt = identifierIsIt(root)
        const vitestIt = isVitestIt(root)
        const flags = Array.make(rootNamedIt, isPlainMethod, vitestIt)

        return Array.every(flags, Boolean)
      })
    )

// it.each(...)("name", cb) is still plain because the effect form is it.effect.
const callExpressionPropertyAccess = (call: ts.CallExpression) =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)

const eachItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(callee),
      Option.flatMap(callExpressionPropertyAccess),
      Option.exists((access) => {
        const root = unwrapTransparentExpression(access.expression)
        const rootNamedIt = identifierIsIt(root)
        const isEach = strictEqual("each")(access.name.text)
        const vitestIt = isVitestIt(root)
        const flags = Array.make(rootNamedIt, isEach, vitestIt)

        return Array.every(flags, Boolean)
      })
    )

const callIsPlainIt = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)
  const isVitestIt = expressionIsEffectVitestIt(checker)
  const bare = bareItCall(isVitestIt)(callee)
  const property = propertyItCall(isVitestIt)(callee)
  const each = eachItCall(isVitestIt)(callee)
  const flags = Array.make(bare, property, each)

  return Array.some(flags, Boolean)
}

const effectTypeSymbolOption = flow(
  (type: ts.Type) => type.getSymbol() ?? type.aliasSymbol,
  Option.fromNullishOr
)

const symbolIsNamedEffectFromPackage = (candidate: ts.Symbol) => {
  const namedEffect = strictEqual("Effect")(candidate.name)
  const fromPackage = symbolDeclaredInEffectPackage(candidate)
  const flags = Array.make(namedEffect, fromPackage)

  return Array.every(flags, Boolean)
}

const symbolLooksLikeEffectAlias = (candidate: ts.Symbol) => {
  const namedEffect = strictEqual("Effect")(candidate.name)
  const namedDefault = strictEqual("default")(candidate.name)
  const nameOkFlags = Array.make(namedEffect, namedDefault)
  const nameOk = Array.some(nameOkFlags, Boolean)
  const fromEffect = symbolDeclaredInEffectPackage(candidate)
  const flags = Array.make(nameOk, fromEffect)

  return Array.some(flags, Boolean)
}

const renderedLooksLikeEffect = (rendered: string) => {
  const includesEffect = rendered.includes("Effect<")
  const startsWithEffectDot = rendered.startsWith("Effect.")
  const flags = Array.make(includesEffect, startsWithEffectDot)

  return Array.some(flags, Boolean)
}

// Confirm via symbol when possible because rendered text is only a fallback for aliases.
const renderedEffectConfirmed =
  (checker: ts.TypeChecker) => (type: ts.Type) => (symbol: Option.Option<ts.Symbol>) => {
    const rendered = checker.typeToString(type)
    const looksLikeEffect = renderedLooksLikeEffect(rendered)
    const symbolOk = Option.exists(symbol, symbolLooksLikeEffectAlias)
    const startsWithEffect = rendered.startsWith("Effect<")
    const confirmedFlags = Array.make(symbolOk, startsWithEffect)
    const confirmed = Array.some(confirmedFlags, Boolean)
    const flags = Array.make(looksLikeEffect, confirmed)

    return Array.every(flags, Boolean)
  }

const signatureReturnsEffect =
  (checker: ts.TypeChecker) => (typeIsEffectCheck: (type: ts.Type) => boolean) =>
    flow(effectReturnTypeOfSignature(checker), typeIsEffectCheck)

const typeIsEffect = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const symbol = effectTypeSymbolOption(type)
  const interfaceEffect = Option.exists(symbol, isEffectInterfaceSymbol)
  const namedEffectFromPackage = Option.exists(symbol, symbolIsNamedEffectFromPackage)
  const renderedConfirmed = renderedEffectConfirmed(checker)(type)(symbol)
  const signatures = type.getCallSignatures()
  const isEffectType = typeIsEffect(checker)
  const returnsEffect = signatureReturnsEffect(checker)(isEffectType)
  const signatureReturns = Array.some(signatures, returnsEffect)

  const flags = Array.make(
    interfaceEffect,
    namedEffectFromPackage,
    renderedConfirmed,
    signatureReturns
  )

  return Array.some(flags, Boolean)
}

const signatureFromCallback = (checker: ts.TypeChecker) =>
  flow(checker.getSignatureFromDeclaration.bind(checker), Option.fromNullishOr)

const callbackStaticallyReturnsEffect =
  (checker: ts.TypeChecker) => (callback: ts.ArrowFunction | ts.FunctionExpression) => {
    const signature = signatureFromCallback(checker)(callback)
    const returnsEffect = flow(effectReturnTypeOfSignature(checker), typeIsEffect(checker))

    return Option.exists(signature, returnsEffect)
  }

const testStyleFinding = makeRuleFinding("effect-test-style")

const sourceHasTestRole = (index: EffectQualityIndex) => (sourceFile: ts.SourceFile) =>
  pipe(roleForSourceFile(index, sourceFile), Option.exists(isTestRole))

const callArguments = Struct.get<ts.CallExpression, "arguments">("arguments")

const functionInitializerOf = (argument: ts.Expression) => {
  const current = unwrapTransparentExpression(argument)

  return isFunctionInitializer(current) ? Result.succeed(current) : Result.failVoid
}

const filterFunctionInitializers = (args: ReadonlyArray<ts.Expression>) =>
  Array.filterMap(args, functionInitializerOf)

const testCallbackArgument = flow(callArguments, filterFunctionInitializers, Array.last)

const findingsForPlainEffectIt = flow(testStyleFinding("it"), Array.of)

const effectTestStyleFindings =
  (context: MatchContext) => (index: EffectQualityIndex) => (node: ts.Node) => {
    const testSource = sourceHasTestRole(index)(context.sourceFile)

    if (!testSource) {
      return emptyRuleFindings
    }

    const isPlainIt = callIsPlainIt(context.checker)
    const returnsEffect = callbackStaticallyReturnsEffect(context.checker)

    const findingsWhenCallbackReturnsEffect = (call: ts.CallExpression) =>
      pipe(
        testCallbackArgument(call),
        Option.filter(returnsEffect),
        Option.map(() => findingsForPlainEffectIt(call))
      )

    return pipe(
      callExpressionOf(node),
      Option.filter(isPlainIt),
      Option.flatMap(findingsWhenCallbackReturnsEffect),
      Option.getOrElse(Function.constant(emptyRuleFindings))
    )
  }

const httpRuleFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const rawFetch = rawFetchAbortFindings(context)(node)
  const responseValidation = httpResponseValidationFindings(context)(index)(node)
  const statusDecodeOrder = httpStatusDecodeOrderFindings(context)(index)(node)
  const testStyle = effectTestStyleFindings(context)(index)(node)
  const findings = Array.make(rawFetch, responseValidation, statusDecodeOrder, testStyle)

  return Array.flatten(findings)
}

const schemaKinds = Array.make(
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.TypeAssertionExpression,
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.FunctionDeclaration
)

const runtimeKinds = Array.make(
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.DeleteExpression,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.ForStatement
)

const httpKinds = Array.make(ts.SyntaxKind.CallExpression)

const anySyntaxNode = (node: ts.Node): node is ts.Node => true

const detectionFromFinding =
  (_context: MatchContext) =>
  (finding: EffectQualityRuleFinding): Match<EffectQualityRuleData> => {
    const data = EffectQualityRuleData.make({
      kind: finding.kind,
      subject: finding.subject
    })

    return makeNodeMatch(finding.node, data)
  }

const ruleElements =
  (find: RuleFindingSource) =>
  (index: EffectQualityIndex) =>
  (context: MatchContext) =>
  (node: ts.Node) =>
    pipe(find(context, index, node), Array.map(detectionFromFinding(context)))

const subscriptionsFor = (kinds: ReadonlyArray<ts.SyntaxKind>) => (find: RuleFindingSource) =>
  flow(ruleElements(find), nodeSubscriptions(kinds)(anySyntaxNode))

const ruleSubscriptions = (
  index: EffectQualityIndex
): ReadonlyArray<Subscription<EffectQualityRuleData>> => {
  const schemaSubscriptions = subscriptionsFor(schemaKinds)(schemaRuleFindings)(index)
  const runtimeSubscriptions = subscriptionsFor(runtimeKinds)(runtimeRuleFindings)(index)
  const httpSubscriptions = subscriptionsFor(httpKinds)(httpRuleFindings)(index)
  const groups = Array.make(schemaSubscriptions, runtimeSubscriptions, httpSubscriptions)

  return Array.flatten(groups)
}

export const makeEffectQualityRulesMatcher = makeEffectQualityMatcher(ruleSubscriptions)
