import type * as ts from "typescript"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import type { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"
import type { EffectQualityIndex } from "./effectQualityIndex.js"
import type { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"

export type EffectQualityRuleFindingSource = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
) => ReadonlyArray<EffectQualityRuleFinding>

export type EffectQualityEvidenceFindingSource = (
  context: MatchContext,
  index: EffectQualityIndex,
  role: ArchitectureRole,
  node: ts.Node
) => ReadonlyArray<EffectQualityAdviceFinding>

export class EffectQualityRuleProjection {
  constructor(
    readonly syntaxKinds: ReadonlyArray<ts.SyntaxKind>,
    readonly findings: EffectQualityRuleFindingSource
  ) {}
}

export class EffectQualityFeature {
  constructor(
    readonly ruleProjections: ReadonlyArray<EffectQualityRuleProjection>,
    readonly evidenceProjections: ReadonlyArray<EffectQualityEvidenceFindingSource>
  ) {}
}
