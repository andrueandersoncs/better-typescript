import { Array, flow, pipe } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions } from "@better-typescript/matchers/matcher"
import {
  nodeMatch,
  type Match,
  type MatchContext,
  type Subscription
} from "@better-typescript/matchers/matcher/data"
import { withEffectQualityIndex, type EffectQualityIndex } from "./index.js"
import { EffectQualityRuleData } from "./data.js"
import { type EffectQualityRuleFinding } from "./findings.js"
import { schemaRuleFindings } from "./reportedSchema.js"
import { runtimeRuleFindings } from "./reportedRuntime.js"
import { httpRuleFindings } from "./reportedHttp.js"

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

type RuleFindingSource = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
) => ReadonlyArray<EffectQualityRuleFinding>

const anySyntaxNode = (node: ts.Node): node is ts.Node => true

const detectionFromFinding =
  (_context: MatchContext) =>
  (finding: EffectQualityRuleFinding): Match<EffectQualityRuleData> => {
    const data = EffectQualityRuleData.make({
      kind: finding.kind,
      subject: finding.subject
    })

    return nodeMatch(finding.node, data)
  }

const ruleElements =
  (find: RuleFindingSource) =>
  (index: EffectQualityIndex) =>
  (context: MatchContext) =>
  (node: ts.Node) =>
    pipe(find(context, index, node), Array.map(detectionFromFinding(context)))

const subscriptionsFor = (kinds: ReadonlyArray<ts.SyntaxKind>) => (find: RuleFindingSource) =>
  flow(ruleElements(find), nodeSubscriptions(kinds)(anySyntaxNode))

const ruleSubscriptions = (index: EffectQualityIndex): ReadonlyArray<Subscription> => {
  const schemaSubscriptions = subscriptionsFor(schemaKinds)(schemaRuleFindings)(index)
  const runtimeSubscriptions = subscriptionsFor(runtimeKinds)(runtimeRuleFindings)(index)
  const httpSubscriptions = subscriptionsFor(httpKinds)(httpRuleFindings)(index)
  const groups = Array.make(schemaSubscriptions, runtimeSubscriptions, httpSubscriptions)

  return Array.flatten(groups)
}

export const makeEffectQualityRulesMatcher = withEffectQualityIndex(ruleSubscriptions)
