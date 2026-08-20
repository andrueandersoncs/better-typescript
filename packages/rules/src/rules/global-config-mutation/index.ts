import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Match as EffectMatch, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { acceptsNode } from "../../internal/scanner/acceptsNode.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { ambientCapabilityPropertySubject } from "./ambientCapabilityPropertySubject.js"
import { binaryAssignmentTarget } from "../../internal/support/hasAssignmentOperator.js"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"
import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

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
    const ambientSubject = ambientCapabilityPropertySubject(context)

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

const globalConfigMutationFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      assignmentTarget(node),
      Option.flatMap(ambientCapabilityFromTarget(context)),
      Option.map(() => makeSubjectMatch("process.env")(node)),
      Option.toArray
    )

const globalConfigMutationScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(
  globalConfigMutationFindings
)

export const globalConfigMutation = makeRule("global-config-mutation")(globalConfigMutationScanner)(
  fixedRuleMessage(
    "Avoid mutating process.env in tests; provide deterministic Config instead.",
    "Use ConfigProvider.fromUnknown or a test configuration service."
  )
)
