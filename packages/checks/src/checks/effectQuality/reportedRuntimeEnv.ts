import { Function, Match, Option, Predicate, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { ambientCapabilityPropertySubject } from "../functionalCoreEffect/support.js"
import { binaryAssignmentTarget, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { roleForSourceFile, type EffectQualityIndex } from "./index.js"
import { isRootRole, isTestRole } from "./architectureRoles.js"
import { makeRuleFinding } from "./makeFindings.js"

const processEnvSubject = "process.env"

const processEnvironmentFinding = makeRuleFinding("process-environment")

const globalConfigMutationFinding = makeRuleFinding("global-config-mutation")

const isRootOrTest = (role: ArchitectureRole) => {
  const root = isRootRole(role)
  const test = isTestRole(role)

  return root || test
}

const isNonRootOrTest = Predicate.not(isRootOrTest)

const ambientCapabilitySubject = (context: CheckContext) => (access: ts.PropertyAccessExpression) =>
  ambientCapabilityPropertySubject(context, access)

const processEnvironmentSubject = (context: CheckContext, node: ts.Node) => {
  const ambientSubject = ambientCapabilitySubject(context)

  const fromProperty = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node),
    Option.flatMap(ambientSubject)
  )

  const nestedPropertyAccess = (access: ts.PropertyAccessExpression) =>
    pipe(
      unwrapTransparentExpression(access.expression),
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.flatMap(ambientSubject),
      Option.map(Function.constant(processEnvSubject))
    )

  const fromNestedProperty = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node),
    Option.flatMap(nestedPropertyAccess)
  )

  const elementPropertyAccess = (access: ts.ElementAccessExpression) =>
    pipe(
      unwrapTransparentExpression(access.expression),
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.flatMap(ambientSubject),
      Option.map(Function.constant(processEnvSubject))
    )

  const fromElement = pipe(
    Option.liftPredicate(ts.isElementAccessExpression)(node),
    Option.flatMap(elementPropertyAccess)
  )

  return pipe(
    fromProperty,
    Option.orElse(Function.constant(fromNestedProperty)),
    Option.orElse(Function.constant(fromElement))
  )
}

export const processEnvironmentFindings = (
  context: CheckContext,
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
    Match.value(node),
    Match.when(ts.isBinaryExpression, binaryAssignmentTarget),
    Match.when(ts.isDeleteExpression, deleteExpressionTarget),
    Match.orElse(() => Option.none())
  )

const accessExpressionUnwrapped = (
  access: ts.PropertyAccessExpression | ts.ElementAccessExpression
) => unwrapTransparentExpression(access.expression)

const ambientCapabilityFromTarget =
  (context: CheckContext) =>
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

export const globalConfigMutationFindings = (
  context: CheckContext,
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
        Option.map(() => globalConfigMutationFinding(processEnvSubject)(node))
      )
    ),
    Option.toArray
  )
