import { Data } from "effect"
import type * as ts from "typescript"
import type { MatchContext } from "../../scanner/matchContext.js"
import type { EffectQualityIndex } from "./effectQualityIndex.js"
import type { EffectQualityRuleCandidate } from "./effectQualityRuleCandidate.js"
import type { EffectQualityRuleData } from "./effectQualityRuleData.js"

export type EffectQualityRuleCandidateSource = (
  context: MatchContext
) => (index: EffectQualityIndex) => (node: ts.Node) => ReadonlyArray<EffectQualityRuleCandidate>

// EffectQualityRuleCheck exists because its fields form one stable data contract used by the linter.
export class EffectQualityRuleCheck extends Data.Class<{
  readonly kind: EffectQualityRuleData["kind"]
  readonly syntaxKinds: ReadonlyArray<ts.SyntaxKind>
  readonly candidates: EffectQualityRuleCandidateSource
}> {}
