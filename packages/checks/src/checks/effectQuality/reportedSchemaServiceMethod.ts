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

const makeObjectFromServiceClass =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
    pipe(
      effectServiceConfigObject(checker, declaration),
      Option.flatMap((config) =>
        pipe(
          propertyAssignmentNamed(config, effectMakeNames),
          Option.map((property) => unwrapTransparentExpression(property.initializer)),
          Option.flatMap((initializer) =>
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
          )
        )
      )
    )

const propertyEvidenceNode = (property: ts.ObjectLiteralElementLike) =>
  pipe(Option.fromNullishOr(property.name), Option.getOrElse(Function.constant(property)))

const serviceMethodSubject = (serviceName: string) => (name: string) => `${serviceName}.${name}`

const serviceMethodFinding = makeRuleFinding("service-method-effect-fn")

const propertyAssignmentMethodFinding =
  (context: CheckContext) => (serviceName: string) => (property: ts.PropertyAssignment) => {
    const methodName = propertyNameText(property.name)
    const initializer = unwrapTransparentExpression(property.initializer)
    const returnsEffect = expressionTypeIsEffectReturning(context.checker)(initializer)
    const wrapped = initializerIsNamedEffectFn(context.checker)(initializer)
    const notWrapped = !wrapped
    const shouldReportChecks = Array.make(returnsEffect, notWrapped)
    const shouldReport = Array.every(shouldReportChecks, Boolean)

    if (!shouldReport) {
      return Option.none()
    }

    return pipe(
      methodName,
      Option.map((name) => {
        const subject = serviceMethodSubject(serviceName)(name)
        const evidence = propertyEvidenceNode(property)

        return serviceMethodFinding(subject)(evidence)
      })
    )
  }

const methodDeclarationFinding =
  (context: CheckContext) => (serviceName: string) => (property: ts.MethodDeclaration) => {
    const methodName = pipe(Option.fromNullishOr(property.name), Option.flatMap(propertyNameText))
    const returnsEffect = functionLikeReturnsEffect(context.checker)(property)

    if (!returnsEffect) {
      return Option.none()
    }

    return pipe(
      methodName,
      Option.map((name) => {
        const subject = serviceMethodSubject(serviceName)(name)
        const evidence = propertyEvidenceNode(property)

        return serviceMethodFinding(subject)(evidence)
      })
    )
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

const serviceMethodAssignmentFindings =
  (context: CheckContext) =>
  (serviceName: string) =>
  (object: ts.ObjectLiteralExpression): ReadonlyArray<EffectQualityRuleFinding> =>
    Array.filterMap(object.properties, (property) =>
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
    )

const contextServiceClassName = (declaration: ts.ClassDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.map(Struct.get("text")),
    Option.getOrElse(Function.constant("Service"))
  )

const extendsContextService = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
  classExtendsEffectApi(checker, declaration, "Context", "Service")

export const contextServiceFindings = (
  context: CheckContext,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(extendsContextService(context.checker)),
    Option.flatMap((declaration) => {
      const serviceName = contextServiceClassName(declaration)
      const findingsForObject = serviceMethodAssignmentFindings(context)(serviceName)

      return pipe(
        makeObjectFromServiceClass(context.checker)(declaration),
        Option.map(findingsForObject)
      )
    }),
    Option.getOrElse(Function.constant(emptyRuleFindings))
  )
