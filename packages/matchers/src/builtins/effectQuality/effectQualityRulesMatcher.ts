import { Array, flow, pipe } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"
import type { Match } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { makeEffectQualityMatcher } from "./buildEffectQualityIndex.js"
import { effectQualityBoundaryFeature } from "./effectQualityBoundaryFeature.js"
import { effectQualityRuntimeFeature } from "./effectQualityRuntimeFeature.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"
import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"
import { EffectQualityRuleData } from "./effectQualityRuleData.js"
import type { RuleFindingSource } from "./ruleFindingSource.js"

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
  const schemaSubscriptions = subscriptionsFor(schemaKinds)(
    effectQualityBoundaryFeature.schemaRuleFindings
  )(index)

  const runtimeSubscriptions = subscriptionsFor(runtimeKinds)(
    effectQualityRuntimeFeature.ruleFindings
  )(index)

  const httpSubscriptions = subscriptionsFor(httpKinds)(
    effectQualityBoundaryFeature.httpRuleFindings
  )(index)

  const groups = Array.make(schemaSubscriptions, runtimeSubscriptions, httpSubscriptions)

  return Array.flatten(groups)
}

export const makeEffectQualityRulesMatcher = makeEffectQualityMatcher(ruleSubscriptions)
