import { Array, flow, pipe } from "effect"
import type * as ts from "typescript"
import { nodeSubscriptions } from "../../scanner/nodeSubscriptions.js"
import { makeNodeMatch } from "../../scanner/makeNodeMatch.js"
import type { Match } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { makeEffectQualityScanner } from "./buildEffectQualityIndex.js"
import type { EffectQualityIndex } from "./effectQualityIndex.js"
import type { EffectQualityRuleCandidate } from "./effectQualityRuleCandidate.js"
import { EffectQualityRuleData } from "./effectQualityRuleData.js"
import type { EffectQualityRuleCheck } from "./effectQualityRuleCheck.js"

const acceptsSubscribedNode = (_node: ts.Node): _node is ts.Node => true

const makeMatchFromCandidate = (
  candidate: EffectQualityRuleCandidate
): Match<EffectQualityRuleData> => {
  const data = EffectQualityRuleData.make({ kind: candidate.kind, subject: candidate.subject })

  return makeNodeMatch(candidate.node, data)
}

const elementsFor =
  (ruleCheck: EffectQualityRuleCheck) =>
  (index: EffectQualityIndex) =>
  (context: MatchContext) =>
  (node: ts.Node) =>
    pipe(ruleCheck.candidates(context)(index)(node), Array.map(makeMatchFromCandidate))

const makeSubscriptionsForRule = (ruleCheck: EffectQualityRuleCheck) => {
  const subscribe = nodeSubscriptions(ruleCheck.syntaxKinds)(acceptsSubscribedNode)

  return flow(elementsFor(ruleCheck), subscribe)
}

export const makeEffectQualityRuleScanner = flow(makeSubscriptionsForRule, makeEffectQualityScanner)
