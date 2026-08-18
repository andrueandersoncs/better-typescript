import { Array, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"
import type { Match } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { makeEffectQualityMatcher } from "./buildEffectQualityIndex.js"
import { effectQualityFeatures } from "./effectQualityFeatureCatalog.js"
import type { EffectQualityRuleProjection } from "./effectQualityRuleProjection.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"
import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"
import { EffectQualityRuleData } from "./effectQualityRuleData.js"

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
  (find: EffectQualityRuleProjection["findings"]) =>
  (index: EffectQualityIndex) =>
  (context: MatchContext) =>
  (node: ts.Node) =>
    pipe(find(context, index, node), Array.map(detectionFromFinding(context)))

const subscriptionsFor =
  (index: EffectQualityIndex) =>
  (projection: EffectQualityRuleProjection): ReadonlyArray<Subscription<EffectQualityRuleData>> => {
    const elements = ruleElements(projection.findings)(index)
    const subscribe = nodeSubscriptions(projection.syntaxKinds)(anySyntaxNode)

    return subscribe(elements)
  }

const ruleSubscriptions = (
  index: EffectQualityIndex
): ReadonlyArray<Subscription<EffectQualityRuleData>> =>
  pipe(
    effectQualityFeatures,
    Array.flatMap(Struct.get("ruleProjections")),
    Array.flatMap(subscriptionsFor(index))
  )

export const makeEffectQualityRulesMatcher = makeEffectQualityMatcher(ruleSubscriptions)
