import {
  Array,
  Data,
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
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { classExtendsEffectApi } from "../../support/effectApi/classExtendsEffectApi.js"
import { effectServiceConfigObject } from "../../support/effectApi/effectServiceConfigObject.js"
import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"
import { isTopLevelExportedDeclaration } from "../../support/effectApi/isTopLevelExportedDeclaration.js"
import { propertyAssignmentNamed } from "../../support/effectApi/propertyAssignments.js"
import { functionDeclarationName } from "../../support/functionDeclarationName.js"
import { functionInitializer } from "../../support/functionInitializer2.js"
import { hasExportModifier } from "../../support/hasExportModifier.js"
import { hasParameters } from "../../support/hasParameters.js"
import { isEffectInterfaceSymbol } from "../../support/isEffectInterfaceSymbol.js"
import { isFunctionInitializer } from "../../support/isFunctionInitializer.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { returnStatementExpression } from "../../support/returnStatementExpression.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { variableDeclarationNameIsIdentifier } from "../../support/variableDeclarationNameIsIdentifier.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

// EffectFnNameInspection holds node and name because findings need both together.
class EffectFnNameInspection extends Data.Class<{
  readonly node: ts.Node
  readonly name: Option.Option<string>
}> {}

const effectFnNames = Array.of("fn")

const isEffectFnApi = (checker: ts.TypeChecker) =>
  flow(unwrapCallee, importedEffectApiAt(checker)("Effect")(effectFnNames))

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

  const targetNode = pipe(
    nameLiteral,
    Option.map(nameLiteralAsNode),
    Option.getOrElse(Function.constant(nested.expression))
  )

  const name = pipe(nameLiteral, Option.map(Struct.get("text")))

  return makeEffectFnNameInspection(name)(targetNode)
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

const serviceMethodSubject = (serviceName: string) => (name: string) => `${serviceName}.${name}`

const propertyTargetNode = (property: ts.ObjectLiteralElementLike) =>
  pipe(Option.fromNullishOr(property.name), Option.getOrElse(Function.constant(property)))

const serviceMethodFindingForName =
  (serviceName: string) => (property: ts.ObjectLiteralElementLike) => (name: string) => {
    const subject = serviceMethodSubject(serviceName)(name)
    const targetNode = propertyTargetNode(property)

    return makeSubjectMatch(subject)(targetNode)
  }

const effectGenNames = Array.of("gen")

const callIsEffectGen = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker)("Effect")(effectGenNames)(call.expression)

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

const qualityFromFunctionNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(node),
    Option.filter(functionDeclarationHasName),
    Option.filter(functionDeclarationIsExported),
    Option.filter(functionLikeReturnsEffect(context.checker)),
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

const effectFnNameFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(node),
      Option.flatMap(inspectEffectFnCall(context.checker)),
      Option.filter(inspectionNameIsUnqualified),
      Option.map((inspection) => {
        const subject = pipe(inspection.name, Option.getOrElse(Function.constant("(anonymous)")))

        return makeSubjectMatch(subject)(inspection.node as ts.Node)
      }),
      Option.toArray
    )

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

const serviceMethodEffectFnScanner = makeNodeScanner(schemaKinds)(acceptsNode)(
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

const effectFnNameScanner = makeNodeScanner(schemaKinds)(acceptsNode)(effectFnNameFindings)

export const effectFnName = makeRule("effect-fn-name")(effectFnNameScanner)(
  fixedRuleMessage(
    "Use a non-empty domain-qualified Effect.fn name.",
    "Use a stable name such as UserRepo.get for tracing and spans."
  )
)
