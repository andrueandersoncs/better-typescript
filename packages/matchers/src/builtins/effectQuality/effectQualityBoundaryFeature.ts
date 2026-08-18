import * as ts from "typescript"
import {
  Array,
  Data,
  Function,
  Option,
  Predicate,
  Result,
  Struct,
  flow,
  pipe,
  Match as EffectMatch,
  Match
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { MatchContext } from "../../matcher/matchContext.js"
import { collectFindings } from "../../support/collectFindings.js"
import { classDeclarationName } from "../../support/classDeclarationName.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { functionDeclarationName } from "../../support/functionDeclarationName.js"
import { functionInitializer } from "../../support/functionInitializer2.js"
import { hasExportModifier } from "../../support/hasExportModifier.js"
import { hasParameters } from "../../support/hasParameters.js"
import { isFunctionInitializer } from "../../support/isFunctionInitializer.js"
import { returnStatementExpression } from "../../support/returnStatementExpression.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { variableDeclarationNameIsIdentifier } from "../../support/variableDeclarationNameIsIdentifier.js"
import { classExtendsEffectApi } from "../functionalCoreEffect/classExtendsEffectApi.js"
import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"
import { effectServiceConfigObject } from "../functionalCoreEffect/effectServiceConfigObject.js"
import { isTopLevelExportedDeclaration } from "../functionalCoreEffect/isTopLevelExportedDeclaration.js"
import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"
import { importedMemberSubject } from "../functionalCoreEffect/importedMemberSubject.js"
import { propertyAssignmentNamed } from "../functionalCoreEffect/propertyAssignments.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"
import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"
import { emptyRuleFindings } from "./emptyRuleFindings.js"
import { makeRuleFinding } from "./makeRuleFinding.js"
import { isEffectInterfaceSymbol } from "../../support/isEffectInterfaceSymbol.js"
import { foldAst } from "../../sources/foldAst.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { symbolDeclaredInEffectPackage } from "../../support/declarationInEffectPackage.js"
import { enclosingFunctionLike } from "../functionalCoreEffect/enclosingFunctionLike.js"
import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"
import { isTestRole } from "./isTestRole.js"
import { roleForSourceFile } from "./roleForSourceFile.js"
import { memberLastName } from "./memberLastName.js"
import { constantNoneString } from "../../support/constantNoneString.js"
import { optionNodeText } from "../../support/optionNodeText.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import { isAdapterOrRootRole } from "../functionalCoreEffect/adapterRootRoles.js"
import { hasEffectCallAncestor } from "../functionalCoreEffect/hasEffectCallAncestor.js"
import { ancestorMatching } from "./ancestorMatching.js"
import { apiSubject } from "./apiSubject.js"
import { backoffScheduleNames } from "./backoffScheduleNames.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"
import { emptyAdviceFindings } from "./emptyAdviceFindings.js"
import { makeAdviceFinding } from "./makeAdviceFinding.js"
import { isProductionRole } from "./productionRoles.js"
import { retryEffectNames } from "./retryEffectNames.js"
import { stringLiteralArgument } from "./stringLiteralArgument.js"
import { declarationNameText } from "./declarationNameText.js"
import { toRelativeFileName } from "../../support/paths.js"
import { EffectQualityFeature, EffectQualityRuleProjection } from "./effectQualityFeature.js"

const makeEffectQualityBoundaryFeature = () => {
  const responseJsonNames = Array.of("json")

  const callIsResponseJson = (call: ts.CallExpression) => {
    const callee = unwrapTransparentExpression(call.expression)

    return (
      ts.isPropertyAccessExpression(callee) && Array.contains(responseJsonNames, callee.name.text)
    )
  }

  const isAdapterRole = strictEqual("adapter")

  const schemaDecodeNames = Array.make(
    "decodeUnknown",
    "decodeUnknownEffect",
    "decodeUnknownSync",
    "decodeUnknownOption",
    "decodeUnknownEither",
    "decodeUnknownResult",
    "decodeUnknownExit",
    "decodeUnknownPromise",
    "decode",
    "decodeEffect",
    "decodeSync",
    "decodeOption",
    "decodeEither",
    "decodeResult",
    "decodeExit",
    "decodePromise"
  )

  const anyKeywordType = flow(
    Struct.get<ts.TypeNode, "kind">("kind"),
    strictEqual(ts.SyntaxKind.AnyKeyword)
  )

  // EffectFnNameInspection holds node and name because findings need both together.
  class EffectFnNameInspection extends Data.Class<{
    readonly node: ts.Node
    readonly name: Option.Option<string>
  }> {}

  const effectFnNames = Array.of("fn")

  const isEffectFnApi = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const callee = unwrapCallee(expression)

    return importedEffectApiAt(checker, callee, "Effect", effectFnNames)
  }

  const effectSymbolOfType = flow((type: ts.Type) => type.getSymbol(), Option.fromNullishOr)

  const effectAliasSymbolOfType = flow(
    Struct.get<ts.Type, "aliasSymbol">("aliasSymbol"),
    Option.fromNullishOr
  )

  const typeIsEffectReturningType = (type: ts.Type) => {
    const direct = pipe(effectSymbolOfType(type), Option.exists(isEffectInterfaceSymbol))
    const alias = pipe(effectAliasSymbolOfType(type), Option.exists(isEffectInterfaceSymbol))
    const checks = Array.make(direct, alias)

    return Array.some(checks, Boolean)
  }

  const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

  const callSignaturesReturnEffect = (checker: ts.TypeChecker) => (type: ts.Type) => {
    const signatures = type.getCallSignatures()

    const signatureReturnsEffect = flow(
      checker.getReturnTypeOfSignature.bind(checker),
      typeIsEffectReturningType
    )

    return Array.some(signatures, signatureReturnsEffect)
  }

  const expressionTypeIsEffectReturning =
    (checker: ts.TypeChecker) => (expression: ts.Expression) => {
      const type = checker.getTypeAtLocation(expression)
      const callReturnsEffect = callSignaturesReturnEffect(checker)(type)
      const typeReturnsEffect = typeIsEffectReturningType(type)
      const checks = Array.make(callReturnsEffect, typeReturnsEffect)

      return Array.some(checks, Boolean)
    }

  const functionLikeReturnsEffect =
    (checker: ts.TypeChecker) => (declaration: ts.SignatureDeclaration) =>
      pipe(
        declaration,
        flow(checker.getSignatureFromDeclaration.bind(checker), Option.fromNullishOr),
        Option.map(checker.getReturnTypeOfSignature.bind(checker)),
        Option.exists(typeIsEffectReturningType)
      )

  const heritageClauseIsExtends = flow(
    Struct.get<ts.HeritageClause, "token">("token"),
    strictEqual(ts.SyntaxKind.ExtendsKeyword)
  )

  const makeEffectFnNameInspection = (name: Option.Option<string>) => (node: ts.Node) =>
    new EffectFnNameInspection({ node, name })

  const effectFnNameLiteral = (call: ts.CallExpression) =>
    pipe(Array.head(call.arguments), Option.filter(ts.isStringLiteralLike))

  const nestedEffectFnNameLiteral = (call: ts.CallExpression) =>
    pipe(
      effectFnNameLiteral(call),
      Option.orElse(() =>
        pipe(
          call.expression,
          Option.liftPredicate(ts.isCallExpression),
          Option.flatMap(effectFnNameLiteral)
        )
      )
    )

  const nestedCallIsEffectFnApi = (checker: ts.TypeChecker) =>
    flow(Struct.get<ts.CallExpression, "expression">("expression"), isEffectFnApi(checker))

  const nameLiteralAsNode = (literal: ts.StringLiteralLike): ts.Node => literal

  const effectFnNameInspectionFromNested = (nested: ts.CallExpression) => {
    const nameLiteral = nestedEffectFnNameLiteral(nested)

    const evidenceNode = pipe(
      nameLiteral,
      Option.map(nameLiteralAsNode),
      Option.getOrElse(Function.constant(nested.expression))
    )

    const name = pipe(nameLiteral, Option.map(Struct.get("text")))

    return makeEffectFnNameInspection(name)(evidenceNode)
  }

  const inspectNamedEffectFnForm = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
    pipe(
      call.expression,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(nestedCallIsEffectFnApi(checker)),
      Option.map(effectFnNameInspectionFromNested)
    )

  const argumentIsEffectFnBody = (argument: ts.Expression) => {
    const isFunction = isFunctionInitializer(argument)
    const isSelfBinding = ts.isObjectLiteralExpression(argument)
    const checks = Array.make(isFunction, isSelfBinding)

    return Array.some(checks, Boolean)
  }

  const inspectBodyEffectFnForm = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
    const isEffectFn = isEffectFnApi(checker)(call.expression)
    const firstArgument = pipe(Array.head(call.arguments), Option.map(unwrapTransparentExpression))
    const isBodyForm = pipe(firstArgument, Option.exists(argumentIsEffectFnBody))
    const emptyName = Option.none<string>()
    const inspection = makeEffectFnNameInspection(emptyName)(call.expression)

    return isEffectFn && isBodyForm ? Option.some(inspection) : Option.none()
  }

  const inspectBodyEffectFnFormFallback =
    (checker: ts.TypeChecker) => (call: ts.CallExpression) => () =>
      inspectBodyEffectFnForm(checker)(call)

  const inspectEffectFnForms = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
    pipe(
      inspectNamedEffectFnForm(checker)(call),
      Option.orElse(inspectBodyEffectFnFormFallback(checker)(call))
    )

  const inspectEffectFnCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
    pipe(
      expression,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.flatMap(inspectEffectFnForms(checker))
    )

  const inspectionHasName = (inspection: EffectFnNameInspection) => Option.isSome(inspection.name)

  const expressionIsNamedEffectFn = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
    pipe(inspectEffectFnCall(checker)(expression), Option.exists(inspectionHasName))

  const initializerIsNamedEffectFn = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
    pipe(expression, unwrapTransparentExpression, expressionIsNamedEffectFn(checker))

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

  const propertySignatureIsUndefinedFreeOptional =
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

  const serviceMethodFinding = makeRuleFinding("service-method-effect-fn")
  const serviceMethodSubject = (serviceName: string) => (name: string) => `${serviceName}.${name}`

  const propertyEvidenceNode = (property: ts.ObjectLiteralElementLike) =>
    pipe(Option.fromNullishOr(property.name), Option.getOrElse(Function.constant(property)))

  const serviceMethodFindingForName =
    (serviceName: string) => (property: ts.ObjectLiteralElementLike) => (name: string) => {
      const subject = serviceMethodSubject(serviceName)(name)
      const evidence = propertyEvidenceNode(property)

      return serviceMethodFinding(subject)(evidence)
    }

  const schemaClassModelNames = Array.make("Class", "TaggedClass")
  const unsafeCastFindingFromTypeNode = makeRuleFinding("unsafe-casts")("as any")
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

  const classExtendsSchemaModel =
    (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
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

  const interfacePairsWithSchema =
    (schemaName: string) => (declaration: ts.InterfaceDeclaration) => {
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
      pipe(
        Option.fromNullishOr(declaration.initializer),
        Option.exists(isSchemaStructCall(checker))
      )

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

  // BodyStatusWalk tracks body-before-status order because that order is the rule subject.
  class BodyStatusWalk extends Data.Class<{
    readonly sawBodyRead: boolean
    readonly sawStatusBefore: boolean
  }> {}

  const callIsImportedApi =
    (predicate: (member: ImportedMember) => boolean) =>
    (checker: ts.TypeChecker) =>
    (expression: ts.Expression) => {
      const unwrapped = unwrapTransparentExpression(expression)
      const callee = unwrapCallee(unwrapped)
      const member = importedMemberAt(checker, callee)

      return Option.exists(member, predicate)
    }

  const httpNamespaceNames = Array.make(
    "HttpClient",
    "HttpClientResponse",
    "HttpClientRequest",
    "FetchHttpClient"
  )

  const segmentIsHttpNamespace = (segment: string) => Array.contains(httpNamespaceNames, segment)

  const moduleIsEffectHttp = (moduleSpecifier: string) => {
    const exactUnstable = strictEqual("effect/unstable/http")(moduleSpecifier)
    const nestedUnstable = moduleSpecifier.startsWith("effect/unstable/http/")
    const platformExact = strictEqual("@effect/platform")(moduleSpecifier)
    const platformNested = moduleSpecifier.startsWith("@effect/platform/")
    const effectHttpNested = moduleSpecifier.startsWith("effect/Http")

    const flags = Array.make(
      exactUnstable,
      nestedUnstable,
      platformExact,
      platformNested,
      effectHttpNested
    )

    return Array.some(flags, Boolean)
  }

  const pathMatchesHttpNamespaceApi = (path: ReadonlyArray<string>) => {
    const hasNamespace = Array.some(path, segmentIsHttpNamespace)
    const singleMemberPath = strictEqual(1)(path.length)
    const pathFlags = Array.make(hasNamespace, singleMemberPath)

    return Array.some(pathFlags, Boolean)
  }

  const barrelPathMatchesHttpNamespace = (path: ReadonlyArray<string>) => {
    const path0 = Array.get(path, 0)
    const path1 = Array.get(path, 1)
    const path2 = Array.get(path, 2)
    const barrelNamespace = pipe(path0, Option.exists(segmentIsHttpNamespace))
    const unstableNamespace = pipe(path2, Option.exists(segmentIsHttpNamespace))
    const hasUnstable = pipe(path0, Option.contains("unstable"))
    const hasHttp = pipe(path1, Option.contains("http"))
    const unstablePathFlags = Array.make(hasUnstable, hasHttp, unstableNamespace)
    const unstablePath = Array.every(unstablePathFlags, Boolean)
    const barrelFlags = Array.make(barrelNamespace, unstablePath)

    return Array.some(barrelFlags, Boolean)
  }

  const memberIsHttpNamespaceApi = (names: ReadonlyArray<string>) => (member: ImportedMember) => {
    const last = memberLastName(member)
    const nameMatches = Array.contains(names, last)
    const fromHttpModule = moduleIsEffectHttp(member.moduleSpecifier)
    const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
    const moduleOkFlags = Array.make(fromHttpModule, fromEffectBarrel)
    const moduleOk = Array.some(moduleOkFlags, Boolean)
    const nonEffectBarrel = member.moduleSpecifier !== "effect"
    const nonEffectHttpFlags = Array.make(fromHttpModule, nonEffectBarrel)
    const nonEffectHttpModule = Array.every(nonEffectHttpFlags, Boolean)

    const pathMatches = nonEffectHttpModule
      ? pathMatchesHttpNamespaceApi(member.path)
      : barrelPathMatchesHttpNamespace(member.path)

    const flags = Array.make(nameMatches, moduleOk, pathMatches)

    return Array.every(flags, Boolean)
  }

  const httpResponseSchemaNames = Array.make("schemaBodyJson", "schemaJson", "schemaNoBody")

  const callIsHttpResponseSchema = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
    callIsImportedApi(memberIsHttpNamespaceApi(httpResponseSchemaNames))(checker)(call.expression)

  const moduleIsEffectSchema = (moduleSpecifier: string) => {
    const fromBarrel = strictEqual("effect")(moduleSpecifier)
    const fromSchema = strictEqual("effect/Schema")(moduleSpecifier)
    const fromSchemaNested = moduleSpecifier.startsWith("effect/Schema/")
    const flags = Array.make(fromBarrel, fromSchema, fromSchemaNested)

    return Array.some(flags, Boolean)
  }

  const memberIsSchemaDecodeApi = (member: ImportedMember) => {
    const schemaModule = moduleIsEffectSchema(member.moduleSpecifier)
    const last = memberLastName(member)
    const nameMatches = Array.contains(schemaDecodeNames, last)
    const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
    const schemaPathHead = Array.get(member.path, 0)
    const barrelSchemaPath = pipe(schemaPathHead, Option.contains("Schema"))
    const pathOk = fromEffectBarrel ? barrelSchemaPath : true
    const flags = Array.make(schemaModule, nameMatches, pathOk)

    return Array.every(flags, Boolean)
  }

  const callIsSchemaDecode = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
    callIsImportedApi(memberIsSchemaDecodeApi)(checker)(call.expression)

  const effectReturnTypeOfSignature = (checker: ts.TypeChecker) => (signature: ts.Signature) =>
    checker.getReturnTypeOfSignature(signature)

  const statusPropertyNames = Array.make("status", "ok", "statusText")

  const literalIsStatusProperty = (literal: ts.StringLiteralLike) =>
    Array.contains(statusPropertyNames, literal.text)

  const propertyAccessNameIsStatus = (access: ts.PropertyAccessExpression) =>
    Array.contains(statusPropertyNames, access.name.text)

  const prefixUnaryAccessesStatus = (unary: ts.PrefixUnaryExpression) =>
    expressionAccessesStatus(unary.operand)

  const postfixUnaryAccessesStatus = (unary: ts.PostfixUnaryExpression) =>
    expressionAccessesStatus(unary.operand)

  const parenthesizedAccessesStatus = (parenthesized: ts.ParenthesizedExpression) =>
    expressionAccessesStatus(parenthesized.expression)

  const asExpressionAccessesStatus = (asExpression: ts.AsExpression) =>
    expressionAccessesStatus(asExpression.expression)

  const satisfiesExpressionAccessesStatus = (satisfiesExpression: ts.SatisfiesExpression) =>
    expressionAccessesStatus(satisfiesExpression.expression)

  const statusAccessOfExpression = (current: ts.Expression): boolean =>
    pipe(
      Match.value(current),
      Match.when(ts.isPropertyAccessExpression, (access) => {
        const nameHit = propertyAccessNameIsStatus(access)
        const nested = expressionAccessesStatus(access.expression)
        const flags = Array.make(nameHit, nested)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isElementAccessExpression, (access) => {
        const argument = unwrapTransparentExpression(access.argumentExpression)

        const literalStatus = pipe(
          Option.liftPredicate(ts.isStringLiteralLike)(argument),
          Option.exists(literalIsStatusProperty)
        )

        const nested = expressionAccessesStatus(access.expression)
        const flags = Array.make(literalStatus, nested)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isCallExpression, (call) => {
        const callee = unwrapTransparentExpression(call.expression)
        const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

        return pipe(propertyAccess, Option.exists(propertyAccessNameIsStatus))
      }),
      Match.when(ts.isBinaryExpression, (binary) => {
        const left = expressionAccessesStatus(binary.left)
        const right = expressionAccessesStatus(binary.right)
        const flags = Array.make(left, right)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isPrefixUnaryExpression, prefixUnaryAccessesStatus),
      Match.when(ts.isPostfixUnaryExpression, postfixUnaryAccessesStatus),
      Match.when(ts.isParenthesizedExpression, parenthesizedAccessesStatus),
      Match.when(ts.isAsExpression, asExpressionAccessesStatus),
      Match.when(ts.isSatisfiesExpression, satisfiesExpressionAccessesStatus),
      Match.when(ts.isConditionalExpression, (conditional) => {
        const condition = expressionAccessesStatus(conditional.condition)
        const whenTrue = expressionAccessesStatus(conditional.whenTrue)
        const whenFalse = expressionAccessesStatus(conditional.whenFalse)
        const flags = Array.make(condition, whenTrue, whenFalse)

        return Array.some(flags, Boolean)
      }),
      Match.orElse(Function.constFalse)
    )

  const expressionAccessesStatus = (expression: ts.Expression): boolean =>
    pipe(expression, unwrapTransparentExpression, statusAccessOfExpression)

  const expressionReferencesName =
    (name: string) =>
    (expression: ts.Expression): boolean => {
      const current = unwrapTransparentExpression(expression)
      const recur = expressionReferencesName(name)
      const identifierIsName = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual(name))

      const propertyAccessReferencesName = (access: ts.PropertyAccessExpression) =>
        recur(access.expression)

      const elementAccessReferencesName = (access: ts.ElementAccessExpression) =>
        recur(access.expression)

      const asExpressionReferencesName = (asExpression: ts.AsExpression) =>
        recur(asExpression.expression)

      const satisfiesExpressionReferencesName = (satisfiesExpression: ts.SatisfiesExpression) =>
        recur(satisfiesExpression.expression)

      const parenthesizedReferencesName = (parenthesized: ts.ParenthesizedExpression) =>
        recur(parenthesized.expression)

      const nonNullReferencesName = (nonNull: ts.NonNullExpression) => recur(nonNull.expression)

      const callArgumentsReferenceName = (call: ts.CallExpression) =>
        Array.some(call.arguments, recur)

      return pipe(
        Match.value(current),
        Match.when(ts.isIdentifier, identifierIsName),
        Match.when(ts.isPropertyAccessExpression, propertyAccessReferencesName),
        Match.when(ts.isElementAccessExpression, elementAccessReferencesName),
        Match.when(ts.isAsExpression, asExpressionReferencesName),
        Match.when(ts.isSatisfiesExpression, satisfiesExpressionReferencesName),
        Match.when(ts.isParenthesizedExpression, parenthesizedReferencesName),
        Match.when(ts.isNonNullExpression, nonNullReferencesName),
        Match.when(ts.isConditionalExpression, (conditional) => {
          const whenTrue = recur(conditional.whenTrue)
          const whenFalse = recur(conditional.whenFalse)
          const flags = Array.make(whenTrue, whenFalse)

          return Array.some(flags, Boolean)
        }),
        Match.when(ts.isBinaryExpression, (binary) => {
          const left = recur(binary.left)
          const right = recur(binary.right)
          const flags = Array.make(left, right)

          return Array.some(flags, Boolean)
        }),
        Match.when(ts.isCallExpression, callArgumentsReferenceName),
        Match.orElse(Function.constFalse)
      )
    }

  const bodyContainsAny =
    (predicate: (node: ts.Node) => boolean) => (found: boolean, current: ts.Node) =>
      found || predicate(current)

  const functionBodyContains =
    (predicate: (node: ts.Node) => boolean) => (body: ts.ConciseBody) => {
      const step = bodyContainsAny(predicate)
      const scan = Function.flip(foldAst(step))(false)

      return scan(body)
    }

  const functionBodyOf = (fn: ts.FunctionLikeDeclaration) => Option.fromNullishOr(fn.body)
  const globalFetchReceivers = Array.make("globalThis", "window", "self")

  const expressionIsFetchCallee = (expression: ts.Expression) => {
    const current = unwrapTransparentExpression(expression)

    if (ts.isIdentifier(current)) {
      return strictEqual("fetch")(current.text)
    }

    const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(current)

    const accessIsNamedFetch = (access: ts.PropertyAccessExpression) =>
      strictEqual("fetch")(access.name.text)

    const unwrapAccessExpression = (access: ts.PropertyAccessExpression) =>
      unwrapTransparentExpression(access.expression)

    const receiverIsGlobalFetch = (receiver: ts.Identifier) =>
      Array.contains(globalFetchReceivers, receiver.text)

    return pipe(
      propertyAccess,
      Option.filter(accessIsNamedFetch),
      Option.map(unwrapAccessExpression),
      Option.filter(ts.isIdentifier),
      Option.exists(receiverIsGlobalFetch)
    )
  }

  const callIsFetch = (call: ts.CallExpression) => expressionIsFetchCallee(call.expression)

  const httpClientRequestNames = Array.make(
    "execute",
    "get",
    "head",
    "post",
    "put",
    "patch",
    "del",
    "options"
  )

  const httpStatusClassifyNames = Array.make("filterStatusOk", "filterStatus", "matchStatus")
  const identifierTextIsIt = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("it"))

  const identifierIsIt = (expression: ts.Expression) =>
    pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsIt))

  const responseBodyNames = Array.make("json", "text", "arrayBuffer", "blob", "formData", "bytes")

  const propertyAccessIsResponseBody = (access: ts.PropertyAccessExpression) =>
    Array.contains(responseBodyNames, access.name.text)

  const callIsResponseBodyRead = (call: ts.CallExpression) => {
    const callee = unwrapTransparentExpression(call.expression)
    const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

    return pipe(propertyAccess, Option.exists(propertyAccessIsResponseBody))
  }

  const bindingNameText = (name: ts.BindingName) =>
    pipe(
      Match.value(name),
      Match.when(ts.isIdentifier, optionNodeText),
      Match.orElse(constantNoneString)
    )

  const signalParameterName = (callback: ts.ArrowFunction | ts.FunctionExpression) =>
    pipe(
      Array.head(callback.parameters),
      Option.map(Struct.get("name")),
      Option.flatMap(bindingNameText)
    )

  const sourceHasAdapterRole = (index: EffectQualityIndex) => (sourceFile: ts.SourceFile) =>
    pipe(roleForSourceFile(index, sourceFile), Option.exists(isAdapterRole))

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
            Option.getOrElse(() =>
              expressionReferencesName(signalName)(spreadAssignment.expression)
            )
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

  const isSchemaOrHttpResponseValidation =
    (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
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
  const responseBodyHasNearbyValidation =
    (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
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

      const flags = Array.make(
        directParentValidation,
        argumentOfValidation,
        functionScopeValidation
      )

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

    return strictEqual(0)(path.length)
      ? member.moduleSpecifier
      : `${member.moduleSpecifier}:${path}`
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
        return new BodyStatusWalk({
          sawBodyRead: true,
          sawStatusBefore: state.sawStatusBefore
        })
      }

      if (classify(current)) {
        return new BodyStatusWalk({
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

      const initial = new BodyStatusWalk({
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

  const calleeMethodName = (expression: ts.Expression) => {
    if (ts.isPropertyAccessExpression(expression)) {
      return expression.name.text
    }

    return ts.isIdentifier(expression) ? expression.text : ""
  }

  const enclosingFunctionName = (node: ts.Node) =>
    pipe(
      enclosingFunctionLike(node),
      Option.flatMap((declaration) => {
        const direct = declarationNameText(declaration)

        if (Option.isSome(direct)) {
          return direct
        }

        return pipe(
          Option.fromNullishOr(declaration.parent),
          Option.flatMap((parent) => {
            const variableName = pipe(
              Option.some(parent),
              Option.filter(ts.isVariableDeclaration),
              Option.map(Struct.get("name")),
              Option.filter(ts.isIdentifier),
              Option.map(Struct.get("text"))
            )

            if (Option.isSome(variableName)) {
              return variableName
            }

            return pipe(
              Option.some(parent),
              Option.filter(ts.isPropertyAssignment),
              Option.map(Struct.get("name")),
              Option.flatMap(propertyNameText)
            )
          })
        )
      })
    )

  const expressionTreeHasEffectApi =
    (checker: ts.TypeChecker) =>
    (namespace: string) =>
    (names: ReadonlyArray<string>) =>
    (expression: ts.Expression) => {
      const apiAt = (nodeExpression: ts.Expression) =>
        importedEffectApiAt(checker, nodeExpression, namespace, names)

      const callExpressionApiAt = (call: ts.CallExpression) => apiAt(call.expression)

      const matchCurrent = (current: ts.Node) =>
        pipe(
          Match.value(current),
          Match.when(ts.isCallExpression, callExpressionApiAt),
          Match.when(ts.isPropertyAccessExpression, apiAt),
          Match.orElse(Function.constFalse)
        )

      const reducer = (found: boolean, current: ts.Node) => {
        const matchesCurrent = matchCurrent(current)
        const signals = Array.make(found, matchesCurrent)

        return Array.some(signals, Boolean)
      }

      return foldAst(reducer)(expression)(false)
    }

  const isAmbientFetchCallee = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const current = unwrapTransparentExpression(expression)
    const isIdentifier = ts.isIdentifier(current)
    const identifierText = isIdentifier ? current.text : ""
    const isFetchName = strictEqual("fetch")(identifierText)
    const isFetchIdentifier = Array.make(isIdentifier, isFetchName)
    const isFetch = Array.every(isFetchIdentifier, Boolean)

    if (!isFetch) {
      return isFetch
    }

    return pipe(
      checker.getSymbolAtLocation(current),
      Option.fromNullishOr,
      Option.exists((symbol) => {
        const declarations = symbol.declarations ?? Array.empty()

        const hasAmbientDeclaration = Array.some(declarations, (declaration) => {
          const file = declaration.getSourceFile()
          const isDomFile = file.fileName.includes("lib.dom")
          const isDomLibParts = Array.make(file.isDeclarationFile, isDomFile)
          const isDomLib = Array.every(isDomLibParts, Boolean)
          const hasFunctionFlag = (symbol.flags & ts.SymbolFlags.Function) !== 0
          const hasNoDeclarations = strictEqual(0)(declarations.length)
          const globalParts = Array.make(hasFunctionFlag, hasNoDeclarations)
          const isGlobalFunction = Array.every(globalParts, Boolean)
          const ambientConditions = Array.make(isDomLib, isGlobalFunction)

          return Array.some(ambientConditions, Boolean)
        })

        // Prefer ambient fetch because local bare bindings still represent the global API.
        const imported = importedMemberAt(checker, current)
        const isUnimported = Option.isNone(imported)
        const ambientOrUnimported = Array.make(isUnimported, hasAmbientDeclaration)

        return Array.some(ambientOrUnimported, Boolean)
      })
    )
  }

  const isBareFetchCall = (checker: ts.TypeChecker) =>
    flow(Struct.get<ts.CallExpression, "expression">("expression"), isAmbientFetchCallee(checker))

  const isFetchHttpClientMember = (member: ImportedMember) => {
    const direct = strictEqual("effect/unstable/http/FetchHttpClient")(member.moduleSpecifier)
    const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
    const pathHead = Array.head(member.path)
    const pathHeadIsFetchHttpClient = pipe(pathHead, Option.contains("FetchHttpClient"))
    const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsFetchHttpClient)
    const httpBarrel = Array.every(httpBarrelParts, Boolean)
    const path0 = Array.get(member.path, 0)
    const path1 = Array.get(member.path, 1)
    const path2 = Array.get(member.path, 2)
    const effectPath0 = pipe(path0, Option.contains("unstable"))
    const effectPath1 = pipe(path1, Option.contains("http"))
    const effectPath2 = pipe(path2, Option.contains("FetchHttpClient"))
    const effectModule = strictEqual("effect")(member.moduleSpecifier)
    const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
    const effectBarrel = Array.every(effectParts, Boolean)
    const sources = Array.make(direct, httpBarrel, effectBarrel)

    return Array.some(sources, Boolean)
  }

  const isHttpClientMember = (member: ImportedMember) => {
    const direct = strictEqual("effect/unstable/http/HttpClient")(member.moduleSpecifier)
    const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
    const pathHead = Array.head(member.path)
    const pathHeadIsHttpClient = pipe(pathHead, Option.contains("HttpClient"))
    const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsHttpClient)
    const httpBarrel = Array.every(httpBarrelParts, Boolean)
    const path0 = Array.get(member.path, 0)
    const path1 = Array.get(member.path, 1)
    const path2 = Array.get(member.path, 2)
    const unstablePath0 = pipe(path0, Option.contains("http"))
    const unstablePath1 = pipe(path1, Option.contains("HttpClient"))
    const unstableModule = strictEqual("effect/unstable")(member.moduleSpecifier)
    const unstableParts = Array.make(unstableModule, unstablePath0, unstablePath1)
    const unstableBarrel = Array.every(unstableParts, Boolean)
    const effectPath0 = pipe(path0, Option.contains("unstable"))
    const effectPath1 = pipe(path1, Option.contains("http"))
    const effectPath2 = pipe(path2, Option.contains("HttpClient"))
    const effectModule = strictEqual("effect")(member.moduleSpecifier)
    const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
    const effectBarrel = Array.every(effectParts, Boolean)
    const sources = Array.make(direct, httpBarrel, unstableBarrel, effectBarrel)

    return Array.some(sources, Boolean)
  }

  const isInsideNamedCallback = (pattern: RegExp) => (node: ts.Node) =>
    pipe(
      enclosingFunctionName(node),
      Option.exists((name) => pattern.test(name))
    )

  const networkMethodNames = Array.make(
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "request",
    "execute",
    "fetch"
  )

  const callLooksLikeNetworkClient = (context: MatchContext) => (node: ts.CallExpression) => {
    const fetchCall = isBareFetchCall(context.checker)(node)

    const httpClient = pipe(
      importedMemberAt(context.checker, node.expression),
      Option.exists((member) => {
        const http = isHttpClientMember(member)
        const fetchHttp = isFetchHttpClientMember(member)
        const members = Array.make(http, fetchHttp)

        return Array.some(members, Boolean)
      })
    )

    const unwrappedExpression = unwrapTransparentExpression(node.expression)

    const methodName = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(unwrappedExpression),
      Option.map((access) => access.name.text),
      Option.getOrElse(Function.constant(""))
    )

    const networkMethod = Array.contains(networkMethodNames, methodName)
    const signals = Array.make(fetchCall, httpClient, networkMethod)

    return Array.some(signals, Boolean)
  }

  const relativeSourcePath = (index: EffectQualityIndex) =>
    flow(Struct.get<ts.SourceFile, "fileName">("fileName"), toRelativeFileName(index.projectRoot))

  const findingWhen =
    (shouldEmit: boolean) =>
    (finding: EffectQualityAdviceFinding): ReadonlyArray<EffectQualityAdviceFinding> =>
      shouldEmit ? Array.of(finding) : emptyAdviceFindings

  const configRefinedNames = Array.make("schema", "mapOrFail", "url", "port", "int", "boolean")
  const jitterScheduleNames = Array.of("jittered")

  const refinedConfigKeyPattern =
    /(?:path|dir|directory|folder|url|uri|host|hostname|endpoint|base[_-]?url|port|id|uuid|identifier|slug|email)$/i

  const mutationOperationPattern =
    /^(create|insert|update|upsert|delete|remove|write|save|put|post|patch|send|publish|enqueue|dispatch|mutate)/i

  const scheduleHasBackoff = (checker: ts.TypeChecker) =>
    expressionTreeHasEffectApi(checker)("Schedule")(backoffScheduleNames)

  const scheduleHasJitter = (checker: ts.TypeChecker) =>
    expressionTreeHasEffectApi(checker)("Schedule")(jitterScheduleNames)

  const retryScheduleArgument = (node: ts.CallExpression) => {
    const hasScheduleSlot = node.arguments.length >= 2
    const hasSingleArgument = strictEqual(1)(node.arguments.length)

    if (hasScheduleSlot) {
      return Option.fromNullishOr(node.arguments[1])
    }

    return hasSingleArgument ? Option.fromNullishOr(node.arguments[0]) : Option.none()
  }

  const operationNameNear = (node: ts.Node) =>
    pipe(enclosingFunctionName(node), Option.getOrElse(Function.constant("")))

  const configRefinedValues =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      if (isTestRole(role)) {
        return emptyAdviceFindings
      }

      const isConfigString = callIsEffectApi(context.checker)("Config")(configStringNames)(node)

      if (!isConfigString) {
        return emptyAdviceFindings
      }

      // Sensitive keys belong to config-secret-redaction because that rule owns redaction shape.
      const key = pipe(stringLiteralArgument(0)(node), Option.getOrElse(Function.constant("")))
      const hasKey = key.length > 0
      const matchesRefinedKey = refinedConfigKeyPattern.test(key)
      const refinedParts = Array.make(hasKey, matchesRefinedKey)
      const refinedShape = Array.every(refinedParts, Boolean)

      const alreadyRefinedParent = hasEffectCallAncestor(
        context.checker,
        node,
        "Config",
        configRefinedNames
      )

      const subject = hasKey ? `Config.string(${JSON.stringify(key)})` : "Config.string"
      const notAlreadyRefined = !alreadyRefinedParent
      const shouldEmitParts = Array.make(refinedShape, notAlreadyRefined)
      const shouldEmit = Array.every(shouldEmitParts, Boolean)
      const finding = makeAdviceFinding("config-refined-values")(subject)(node.expression)

      return findingWhen(shouldEmit)(finding)
    }

  const retryWithoutJitter =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      if (isTestRole(role)) {
        return emptyAdviceFindings
      }

      const isRetry = callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)

      if (!isRetry) {
        return emptyAdviceFindings
      }

      const subject = apiSubject(context)("Effect.retry")(node.expression)
      const finding = makeAdviceFinding("retry-without-jitter")(subject)(node.expression)

      return pipe(
        retryScheduleArgument(node),
        Option.filter(scheduleHasBackoff(context.checker)),
        Option.filter(Predicate.not(scheduleHasJitter(context.checker))),
        Option.map(Function.constant(finding)),
        Option.map(Array.of),
        Option.getOrElse(Function.constant(emptyAdviceFindings))
      )
    }

  const idempotentRetry =
    (context: MatchContext) =>
    (index: EffectQualityIndex) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const notRetry = !callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)
      const skip = Array.make(testRole, nonProduction, notRetry)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const operation = operationNameNear(node)
      const missingOperation = strictEqual(0)(operation.length)
      const alreadyIdempotent = index.policy.idempotentOperation(operation)
      const notMutation = !mutationOperationPattern.test(operation)
      const quiet = Array.make(missingOperation, alreadyIdempotent, notMutation)

      if (Array.some(quiet, Boolean)) {
        return emptyAdviceFindings
      }

      const api = apiSubject(context)("Effect.retry")(node.expression)
      const subject = `${api} (${operation})`
      const finding = makeAdviceFinding("idempotent-retry")(subject)(node.expression)

      return Array.of(finding)
    }

  const rawFetchOutsideAdapter =
    (context: MatchContext) =>
    (index: EffectQualityIndex) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      if (!isBareFetchCall(context.checker)(node)) {
        return emptyAdviceFindings
      }

      const adapterOrRoot = isAdapterOrRootRole(role)
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const relative = relativeSourcePath(index)(context.sourceFile)
      const exception = index.policy.rawFetchException(relative)
      const skipRoles = Array.make(adapterOrRoot, testRole, nonProduction, exception)

      if (Array.some(skipRoles, Boolean)) {
        return emptyAdviceFindings
      }

      const finding = makeAdviceFinding("raw-fetch-outside-adapter")("fetch")(node.expression)

      return Array.of(finding)
    }

  const httpClientPreference =
    (context: MatchContext) =>
    (index: EffectQualityIndex) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      // Prefer Effect HttpClient inside adapters because outside-adapter raw fetch is separate adv...
      const notAdapter = !isAdapterRole(role)
      const notBareFetch = !isBareFetchCall(context.checker)(node)
      const skip = Array.make(notAdapter, notBareFetch)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const relative = relativeSourcePath(index)(context.sourceFile)

      if (index.policy.rawFetchException(relative)) {
        return emptyAdviceFindings
      }

      // Quiet when the file already wires HttpClient because preference is already met.
      const memberUsesHttpClient = (member: ImportedMember) => {
        const http = isHttpClientMember(member)
        const fetchHttp = isFetchHttpClientMember(member)
        const members = Array.make(http, fetchHttp)

        return Array.some(members, Boolean)
      }

      const expressionUsesHttpClient = (expression: ts.Expression) =>
        pipe(importedMemberAt(context.checker, expression), Option.exists(memberUsesHttpClient))

      const currentUsesHttpClient = (current: ts.Node) =>
        pipe(
          EffectMatch.value(current),
          EffectMatch.when(ts.isIdentifier, expressionUsesHttpClient),
          EffectMatch.when(ts.isPropertyAccessExpression, expressionUsesHttpClient),
          EffectMatch.orElse(Function.constFalse)
        )

      const fileUsesHttpClientReducer = (found: boolean, current: ts.Node) => {
        const usesHttpClient = currentUsesHttpClient(current)
        const signals = Array.make(found, usesHttpClient)

        return Array.some(signals, Boolean)
      }

      const fileUsesHttpClient = foldAst(fileUsesHttpClientReducer)(context.sourceFile)(false)

      if (fileUsesHttpClient) {
        return emptyAdviceFindings
      }

      const finding = makeAdviceFinding("http-client-preference")("fetch")(node.expression)

      return Array.of(finding)
    }

  const handlerNamePattern = /(?:handler|route|controller|endpoint|resolve|loader|action)$/i

  const transactionNamePattern =
    /(?:transaction|withTransaction|useTransaction|transact|inTransaction)/i

  const persistenceMethodNames = Array.make(
    "query",
    "insert",
    "update",
    "delete",
    "upsert",
    "execute",
    "transaction",
    "withTransaction",
    "save",
    "write",
    "create",
    "remove"
  )

  const callLooksLikePersistence = (node: ts.CallExpression) => {
    const expression = unwrapTransparentExpression(node.expression)
    const methodName = calleeMethodName(expression)

    return Array.contains(persistenceMethodNames, methodName)
  }

  const isInsideTransactionCallback = (node: ts.Node) => {
    const named = isInsideNamedCallback(transactionNamePattern)(node)

    const callNamed = pipe(
      ancestorMatching(ts.isCallExpression)(node),
      Option.exists((call) => {
        const expression = unwrapTransparentExpression(call.expression)
        const method = calleeMethodName(expression)

        return transactionNamePattern.test(method)
      })
    )

    const signals = Array.make(named, callNamed)

    return Array.some(signals, Boolean)
  }

  const thinHttpHandlers =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      // Prefer adapter/application HTTP edges because composition roots own wiring.
      const isAdapter = strictEqual("adapter")(role)
      const isApplication = strictEqual("application")(role)
      const allowedRoles = Array.make(isAdapter, isApplication)
      const allowedRole = Array.some(allowedRoles, Boolean)
      const outsideHandler = !isInsideNamedCallback(handlerNamePattern)(node)
      const skip = Array.make(!allowedRole, outsideHandler)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      // FCE already reports non-root provide* because this check is about handler-local persistence.
      const persistence = callLooksLikePersistence(node)
      const networkCall = callLooksLikeNetworkClient(context)(node)
      const networkParts = Array.make(networkCall, isApplication)
      const networkInApplication = Array.every(networkParts, Boolean)
      const signals = Array.make(persistence, networkInApplication)

      if (!Array.some(signals, Boolean)) {
        return emptyAdviceFindings
      }

      const subject = node.expression.getText()
      const finding = makeAdviceFinding("thin-http-handlers")(subject)(node.expression)

      return Array.of(finding)
    }

  const transactionNetworkWork =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const outsideTransaction = !isInsideTransactionCallback(node)
      const notNetwork = !callLooksLikeNetworkClient(context)(node)
      const skip = Array.make(testRole, nonProduction, outsideTransaction, notNetwork)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const subject = node.expression.getText()
      const finding = makeAdviceFinding("transaction-network-work")(subject)(node.expression)

      return Array.of(finding)
    }

  const callIsJsonParse = (node: ts.CallExpression) => {
    const expression = unwrapTransparentExpression(node.expression)
    const isPropertyAccess = ts.isPropertyAccessExpression(expression)

    if (!isPropertyAccess) {
      return isPropertyAccess
    }

    const isParse = strictEqual("parse")(expression.name.text)
    const receiver = unwrapTransparentExpression(expression.expression)
    const isIdentifier = ts.isIdentifier(receiver)
    const receiverText = isIdentifier ? receiver.text : ""
    const isJsonName = strictEqual("JSON")(receiverText)
    const jsonParts = Array.make(isIdentifier, isJsonName)
    const jsonReceiver = Array.every(jsonParts, Boolean)
    const checks = Array.make(isParse, jsonReceiver)

    return Array.every(checks, Boolean)
  }

  const requestJsonAccess = (expression: ts.Expression) => {
    const access = unwrapTransparentExpression(expression)
    const isPropertyAccess = ts.isPropertyAccessExpression(access)

    if (!isPropertyAccess) {
      return isPropertyAccess
    }

    const receiver = access.expression.getText()
    const isJsonMethod = strictEqual("json")(access.name.text)
    const looksLikeRequest = /request|req|body|payload|event/i.test(receiver)
    const checks = Array.make(isJsonMethod, looksLikeRequest)

    return Array.every(checks, Boolean)
  }

  const parentDecodesNode = (checker: ts.TypeChecker) => (parent: ts.Node) => {
    if (ts.isCallExpression(parent)) {
      return callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent)
    }

    const grandparentCall = ts.isCallExpression(parent.parent)

    return grandparentCall
      ? callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent.parent)
      : grandparentCall
  }

  const boundarySchemaDecode =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const responseJson = callIsResponseJson(node)
      const skip = Array.make(testRole, nonProduction, responseJson)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const jsonParse = callIsJsonParse(node)
      // request.json is boundary-shaped because it is not the HTTP response rule.
      const requestJson = requestJsonAccess(node.expression)
      const candidates = Array.make(jsonParse, requestJson)

      if (!Array.some(candidates, Boolean)) {
        return emptyAdviceFindings
      }

      // Quiet when decode is composed directly around this node because Schema already validates.
      const parentDecodes = pipe(
        Option.fromNullishOr(node.parent),
        Option.exists(parentDecodesNode(context.checker))
      )

      const nearbyDecodeReducer = (found: boolean, current: ts.Node) => {
        const isCall = ts.isCallExpression(current)

        const isDecodeCall =
          isCall && callIsEffectApi(context.checker)("Schema")(schemaDecodeNames)(current)

        const signals = Array.make(found, isDecodeCall)

        return Array.some(signals, Boolean)
      }

      const scan = Function.flip(foldAst(nearbyDecodeReducer))(false)
      const nearbyDecode = pipe(enclosingFunctionLike(node), Option.exists(scan))
      const alreadyDecoded = Array.make(parentDecodes, nearbyDecode)

      if (Array.some(alreadyDecoded, Boolean)) {
        return emptyAdviceFindings
      }

      const subject = jsonParse ? "JSON.parse" : node.expression.getText()
      const finding = makeAdviceFinding("boundary-schema-decode")(subject)(node.expression)

      return Array.of(finding)
    }

  const effectQualityBoundaryFindings = (
    context: MatchContext,
    index: EffectQualityIndex,
    role: ArchitectureRole,
    node: ts.Node
  ): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (!ts.isCallExpression(node)) {
      return emptyAdviceFindings
    }

    const configFindings = configRefinedValues(context)(role)(node)
    const retryFindings = retryWithoutJitter(context)(role)(node)
    const rawFetchFindings = rawFetchOutsideAdapter(context)(index)(role)(node)
    const httpClientFindings = httpClientPreference(context)(index)(role)(node)
    const handlerFindings = thinHttpHandlers(context)(role)(node)
    const transactionFindings = transactionNetworkWork(context)(role)(node)
    const decodeFindings = boundarySchemaDecode(context)(role)(node)
    const idempotencyFindings = idempotentRetry(context)(index)(role)(node)

    const collectors = Array.make(
      configFindings,
      retryFindings,
      rawFetchFindings,
      httpClientFindings,
      handlerFindings,
      transactionFindings,
      decodeFindings,
      idempotencyFindings
    )

    return Array.flatten(collectors)
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

  const httpKinds = Array.of(ts.SyntaxKind.CallExpression)

  const ruleProjections = Array.make(
    new EffectQualityRuleProjection(schemaKinds, schemaRuleFindings),
    new EffectQualityRuleProjection(httpKinds, httpRuleFindings)
  )

  const evidenceProjections = Array.of(effectQualityBoundaryFindings)

  return new EffectQualityFeature(ruleProjections, evidenceProjections)
}

export const effectQualityBoundaryFeature = makeEffectQualityBoundaryFeature()
