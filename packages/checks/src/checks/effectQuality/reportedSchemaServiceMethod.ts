import { Array, Function, Match, Option, Result, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import {
  classExtendsEffectApi,
  effectServiceConfigObject,
  importedEffectApiAt,
  propertyAssignmentNamed
} from "../functionalCoreEffect/support.js"
import { propertyNameText, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { emptyRuleFindings, makeRuleFinding } from "./makeFindings.js"
import {
  expressionTypeIsEffectReturning,
  functionLikeReturnsEffect,
  initializerIsNamedEffectFn
} from "./reportedSchemaEffectReturn.js"
import { exportedEffectFunctionFindings } from "./reportedSchemaExportedEffectFn.js"
import type { EffectQualityIndex } from "./index.js"

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
      Match.value(initializer),
      Match.when(
        ts.isObjectLiteralExpression,
        Option.some as (
          object: ts.ObjectLiteralExpression
        ) => Option.Option<ts.ObjectLiteralExpression>
      ),
      Match.when(ts.isCallExpression, objectFromSucceedOrSync(checker)),
      Match.orElse(Option.none as () => Option.Option<ts.ObjectLiteralExpression>)
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

const propertyEvidenceNode = (property: ts.ObjectLiteralElementLike) =>
  pipe(Option.fromNullishOr(property.name), Option.getOrElse(Function.constant(property)))

const serviceMethodSubject = (serviceName: string) => (name: string) => `${serviceName}.${name}`

const serviceMethodFinding = makeRuleFinding("service-method-effect-fn")

const serviceMethodFindingForName =
  (serviceName: string) => (property: ts.ObjectLiteralElementLike) => (name: string) => {
    const subject = serviceMethodSubject(serviceName)(name)
    const evidence = propertyEvidenceNode(property)

    return serviceMethodFinding(subject)(evidence)
  }

const propertyAssignmentMethodFinding =
  (context: CheckContext) => (serviceName: string) => (property: ts.PropertyAssignment) => {
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
  (context: CheckContext) => (serviceName: string) => (property: ts.MethodDeclaration) => {
    const methodName = pipe(Option.fromNullishOr(property.name), Option.flatMap(propertyNameText))
    const returnsEffect = functionLikeReturnsEffect(context.checker)(property)

    return returnsEffect
      ? pipe(methodName, Option.map(serviceMethodFindingForName(serviceName)(property)))
      : Option.none()
  }

const shorthandPropertyMethodFinding =
  (context: CheckContext) =>
  (serviceName: string) =>
  (property: ts.ShorthandPropertyAssignment) => {
    const methodName = property.name.text
    const returnsEffect = expressionTypeIsEffectReturning(context.checker)(property.name)
    const wrapped = initializerIsNamedEffectFn(context.checker)(property.name)
    const notWrapped = !wrapped
    const shouldReportChecks = Array.make(returnsEffect, notWrapped)
    const shouldReport = Array.every(shouldReportChecks, Boolean)

    if (!shouldReport) {
      return Option.none()
    }

    const subject = serviceMethodSubject(serviceName)(methodName)
    const finding = serviceMethodFinding(subject)(property.name)

    return Option.some(finding)
  }

const serviceMethodFindingFromProperty =
  (context: CheckContext) => (serviceName: string) => (property: ts.ObjectLiteralElementLike) =>
    pipe(
      Match.value(property),
      Match.when(ts.isPropertyAssignment, propertyAssignmentMethodFinding(context)(serviceName)),
      Match.when(ts.isMethodDeclaration, methodDeclarationFinding(context)(serviceName)),
      Match.when(
        ts.isShorthandPropertyAssignment,
        shorthandPropertyMethodFinding(context)(serviceName)
      ),
      Match.orElse(Option.none as () => Option.Option<EffectQualityRuleFinding>),
      Result.fromOption(Function.constVoid)
    )

const serviceMethodAssignmentFindings =
  (context: CheckContext) =>
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
  (context: CheckContext) => (declaration: ts.ClassDeclaration) => {
    const serviceName = contextServiceClassName(declaration)
    const findingsForObject = serviceMethodAssignmentFindings(context)(serviceName)

    return pipe(
      makeObjectFromServiceClass(context.checker)(declaration),
      Option.map(findingsForObject)
    )
  }

const contextServiceFindings = (
  context: CheckContext,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(extendsContextService(context.checker)),
    Option.flatMap(contextServiceFindingsFromDeclaration(context)),
    Option.getOrElse(Function.constant(emptyRuleFindings))
  )

export const serviceMethodEffectFnFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const serviceClass = contextServiceFindings(context, node)
  const exportedFunctions = exportedEffectFunctionFindings(context, node)

  return Array.appendAll(serviceClass, exportedFunctions)
}
