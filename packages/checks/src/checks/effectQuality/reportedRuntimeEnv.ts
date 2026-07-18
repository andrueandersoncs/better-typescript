import { Function, Match, Option, Predicate, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { ambientCapabilityPropertySubject } from "../functionalCoreEffect/support.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import type { EffectQualityIndex } from "./index.js"
import { isRootRole, isTestRole } from "./architectureRoles.js"
import { makeRuleFinding } from "./makeFindings.js"
import { roleOf } from "./reportedRuntimeSupport.js"

const processEnvSubject = "process.env"

const processEnvironmentFinding = makeRuleFinding("process-environment")

const globalConfigMutationFinding = makeRuleFinding("global-config-mutation")

const isRootOrTest = (role: ArchitectureRole) => {
  const root = isRootRole(role)
  const test = isTestRole(role)

  return root || test
}

const isNonRootOrTest = Predicate.not(isRootOrTest)

const processEnvironmentSubject = (context: CheckContext, node: ts.Node) => {
  const fromProperty = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node),
    Option.flatMap((access) => ambientCapabilityPropertySubject(context, access))
  )

  const nestedPropertyAccess = (access: ts.PropertyAccessExpression) =>
    pipe(
      unwrapTransparentExpression(access.expression),
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.flatMap((inner) => ambientCapabilityPropertySubject(context, inner)),
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
      Option.flatMap((inner) => ambientCapabilityPropertySubject(context, inner)),
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
    roleOf(index, context.sourceFile),
    Option.filter(isNonRootOrTest),
    Option.flatMap(() => processEnvironmentSubject(context, node)),
    Option.map(Function.flip(processEnvironmentFinding)(node)),
    Option.toArray
  )

const isAssignmentOperator = (expression: ts.BinaryExpression) => {
  const kind = expression.operatorToken.kind
  const atLeastFirst = kind >= ts.SyntaxKind.FirstAssignment
  const atMostLast = kind <= ts.SyntaxKind.LastAssignment

  return atLeastFirst && atMostLast
}

const assignmentTarget = (node: ts.Node) =>
  pipe(
    Match.value(node),
    Match.when(ts.isBinaryExpression, (expression) =>
      isAssignmentOperator(expression) ? Option.some(expression.left) : Option.none()
    ),
    Match.when(ts.isDeleteExpression, (expression) => Option.some(expression.expression)),
    Match.orElse(() => Option.none())
  )

const ambientCapabilityFromTarget =
  (context: CheckContext) =>
  (target: ts.Expression): Option.Option<string> => {
    const unwrapped = unwrapTransparentExpression(target)

    const direct = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
      Option.flatMap((access) => ambientCapabilityPropertySubject(context, access))
    )

    const nested = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
      Option.map((access) => unwrapTransparentExpression(access.expression)),
      Option.filter(ts.isPropertyAccessExpression),
      Option.flatMap((access) => ambientCapabilityPropertySubject(context, access))
    )

    const element = pipe(
      Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
      Option.map((access) => unwrapTransparentExpression(access.expression)),
      Option.filter(ts.isPropertyAccessExpression),
      Option.flatMap((access) => ambientCapabilityPropertySubject(context, access))
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
    roleOf(index, context.sourceFile),
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
