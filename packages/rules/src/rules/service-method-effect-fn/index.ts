import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import {
  Array,
  Match as EffectMatch,
  Function,
  Option,
  Predicate,
  Result,
  Struct,
  flow,
  pipe
} from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import {
  expressionIsFunctionReturningEffectGen,
  functionReturnsEffectGen
} from "../../internal/builtins/effectGenReturningFunction.js"

import { classExtendsEffectApi } from "../../internal/support/effectApi/classExtendsEffectApi.js"

import { effectServiceConfigObject } from "./effectServiceConfigObject.js"

import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

import { isTopLevelExportedDeclaration } from "./isTopLevelExportedDeclaration.js"

import { propertyAssignmentNamed } from "../../internal/support/effectApi/propertyAssignments.js"

import { functionDeclarationName } from "../../internal/support/functionDeclarationName.js"

import { hasExportModifier } from "../../internal/support/hasExportModifier.js"

import { isEffectInterfaceSymbol } from "../../internal/support/isEffectInterfaceSymbol.js"

import { isFunctionInitializer } from "../../internal/support/isFunctionInitializer.js"

import { propertyNameText } from "../../internal/support/propertyNameText.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { variableDeclarationNameIsIdentifier } from "../../internal/support/variableDeclarationNameIsIdentifier.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  EffectFnNameInspection,
  inspectEffectFnCall
} from "../../internal/builtins/effectQuality/serviceRulesShared.js"

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

const inspectionHasName = (inspection: EffectFnNameInspection) => Option.isSome(inspection.name)

const expressionIsNamedEffectFn = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(inspectEffectFnCall(checker)(expression), Option.exists(inspectionHasName))

const initializerIsNamedEffectFn = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(expression, unwrapTransparentExpression, expressionIsNamedEffectFn(checker))

const serviceMethodSubject = (serviceName: string) => (name: string) => `${serviceName}.${name}`

const propertyTargetNode = (property: ts.ObjectLiteralElementLike) =>
  pipe(Option.fromNullishOr(property.name), Option.getOrElse(Function.constant(property)))

const serviceMethodFindingForName =
  (serviceName: string) => (property: ts.ObjectLiteralElementLike) => (name: string) => {
    const subject = serviceMethodSubject(serviceName)(name)
    const targetNode = propertyTargetNode(property)

    return makeSubjectMatch(subject)(targetNode)
  }

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

const qualityFindingFromVariableName = (name: ts.Identifier) => makeSubjectMatch(name.text)(name)

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

const variableReturnsEffectGen =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
    pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.exists(expressionIsFunctionReturningEffectGen(checker))
    )

const qualityFromVariableNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.flatMap(exportedVariableDeclaration),
    Option.filter(Predicate.not(variableReturnsEffectGen(context.checker))),
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

const targetFromFunctionDeclaration = (declaration: ts.FunctionDeclaration) =>
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
  const targetNode = targetFromFunctionDeclaration(declaration)

  return makeSubjectMatch(subject)(targetNode)
}

const functionDoesNotReturnEffectGen = (checker: ts.TypeChecker) =>
  flow(functionReturnsEffectGen(checker), Option.isNone)

const qualityFromFunctionNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(node),
    Option.filter(functionDeclarationHasName),
    Option.filter(functionDeclarationIsExported),
    Option.filter(functionLikeReturnsEffect(context.checker)),
    Option.filter(functionDoesNotReturnEffectGen(context.checker)),
    Option.map(qualityFindingFromFunctionDeclaration)
  )

const exportedEffectFunctionFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const fromVariable = qualityFromVariableNode(context)(node)
    const fromFunction = qualityFromFunctionNode(context)(node)
    const candidates = Array.make(fromVariable, fromFunction)

    return pipe(candidates, Array.flatMap(Option.toArray))
  }

const effectMakeNames = Array.of("make")

const effectSucceedSyncNames = Array.make("succeed", "sync")

const objectFromSucceedOrSync = (checker: ts.TypeChecker) => (initializer: ts.CallExpression) => {
  const isSucceedOrSync = importedEffectApiAt(checker)("Effect")(effectSucceedSyncNames)(
    initializer.expression
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
    propertyAssignmentNamed(effectMakeNames)(config),
    Option.filter(ts.isPropertyAssignment),
    Option.map(propertyInitializerExpression),
    Option.flatMap(objectLiteralFromMakeInitializer(checker))
  )

const makeObjectFromServiceClass =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
    pipe(
      effectServiceConfigObject(checker)(declaration),
      Option.flatMap(makeObjectFromConfig(checker))
    )

const propertyAssignmentMethodFinding =
  (context: MatchContext) => (serviceName: string) => (property: ts.PropertyAssignment) => {
    const methodName = propertyNameText(property.name)
    const initializer = unwrapTransparentExpression(property.initializer)
    const returnsEffect = expressionTypeIsEffectReturning(context.checker)(initializer)
    const returnsEffectGen = expressionIsFunctionReturningEffectGen(context.checker)(initializer)
    const wrapped = initializerIsNamedEffectFn(context.checker)(initializer)
    const notWrapped = !wrapped
    const shouldReportChecks = Array.make(returnsEffect, !returnsEffectGen, notWrapped)
    const shouldReport = Array.every(shouldReportChecks, Boolean)

    return shouldReport
      ? pipe(methodName, Option.map(serviceMethodFindingForName(serviceName)(property)))
      : Option.none()
  }

const methodDeclarationFinding =
  (context: MatchContext) => (serviceName: string) => (property: ts.MethodDeclaration) => {
    const methodName = pipe(Option.fromNullishOr(property.name), Option.flatMap(propertyNameText))
    const returnsEffect = functionLikeReturnsEffect(context.checker)(property)
    const effectGenInspection = functionReturnsEffectGen(context.checker)(property)
    const doesNotReturnEffectGen = Option.isNone(effectGenInspection)
    const shouldReportChecks = Array.make(returnsEffect, doesNotReturnEffectGen)
    const shouldReport = Array.every(shouldReportChecks, Boolean)

    return shouldReport
      ? pipe(methodName, Option.map(serviceMethodFindingForName(serviceName)(property)))
      : Option.none()
  }

const shorthandPropertyMethodFinding =
  (context: MatchContext) =>
  (serviceName: string) =>
  (property: ts.ShorthandPropertyAssignment) => {
    const returnsEffect = expressionTypeIsEffectReturning(context.checker)(property.name)
    const returnsEffectGen = expressionIsFunctionReturningEffectGen(context.checker)(property.name)
    const wrapped = initializerIsNamedEffectFn(context.checker)(property.name)
    const notWrapped = !wrapped
    const shouldReportChecks = Array.make(returnsEffect, !returnsEffectGen, notWrapped)
    const shouldReport = Array.every(shouldReportChecks, Boolean)

    if (!shouldReport) {
      return Option.none()
    }

    const subject = serviceMethodSubject(serviceName)(property.name.text)
    const finding = makeSubjectMatch(subject)(property.name)

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
      EffectMatch.orElse(Option.none as () => Option.Option<ScannerMatch<string>>),
      Result.fromOption(Function.constVoid)
    )

const serviceMethodAssignmentFindings =
  (context: MatchContext) =>
  (serviceName: string) =>
  (object: ts.ObjectLiteralExpression): ReadonlyArray<ScannerMatch<string>> =>
    Array.filterMap(object.properties, serviceMethodFindingFromProperty(context)(serviceName))

const contextServiceClassName = (declaration: ts.ClassDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.map(Struct.get("text")),
    Option.getOrElse(Function.constant("Service"))
  )

const extendsContextService = (checker: ts.TypeChecker) =>
  classExtendsEffectApi(checker)("Context")("Service")

const contextServiceFindingsFromDeclaration =
  (context: MatchContext) => (declaration: ts.ClassDeclaration) => {
    const serviceName = contextServiceClassName(declaration)
    const findingsForObject = serviceMethodAssignmentFindings(context)(serviceName)

    return pipe(
      makeObjectFromServiceClass(context.checker)(declaration),
      Option.map(findingsForObject)
    )
  }

const contextServiceFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isClassDeclaration)(node),
      Option.filter(extendsContextService(context.checker)),
      Option.flatMap(contextServiceFindingsFromDeclaration(context)),
      Option.getOrElse(Function.constant(noSubjectMatches))
    )

const serviceMethodEffectFnFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const serviceClass = contextServiceFindings(context)(node)
    const exportedFunctions = exportedEffectFunctionFindings(context)(node)

    return Array.appendAll(serviceClass, exportedFunctions)
  }

const serviceMethodEffectFnScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  serviceMethodEffectFnFindings
)

export const serviceMethodEffectFn = makeRule("service-method-effect-fn")(
  serviceMethodEffectFnScanner
)(
  fixedRuleMessage(
    "Wrap public Effect service operations with a named Effect.fn.",
    "Name the operation Domain.operation and keep the generator body focused on its workflow."
  )
)
