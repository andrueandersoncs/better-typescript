import type * as ts from "typescript"
import { EffectQualityRuleCandidate } from "./effectQualityRuleCandidate.js"
import type { EffectQualityRuleData } from "./effectQualityRuleData.js"

export const makeRuleCandidate =
  (kind: EffectQualityRuleData["kind"]) =>
  (subject: string) =>
  (node: ts.Node): EffectQualityRuleCandidate =>
    new EffectQualityRuleCandidate({ kind, node, subject })
