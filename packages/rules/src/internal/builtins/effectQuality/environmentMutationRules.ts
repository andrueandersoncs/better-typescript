import { Array, Match as EffectMatch, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { ambientCapabilityPropertySubject } from "../../support/effectApi/ambientCapabilityPropertySubject.js"
import { binaryAssignmentTarget } from "../../support/hasAssignmentOperator.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { makeSubjectMatch } from "./subjectMatch.js"

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

const globalConfigMutationScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  globalConfigMutationFindings
)

export const globalConfigMutation = makeRule("global-config-mutation")(globalConfigMutationScanner)(
  fixedRuleMessage(
    "Avoid mutating process.env in tests; provide deterministic Config instead.",
    "Use ConfigProvider.fromUnknown or a test configuration service."
  )
)
