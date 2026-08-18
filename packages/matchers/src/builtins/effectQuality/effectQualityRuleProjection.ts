import type * as ts from "typescript"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { EffectQualityIndex } from "./effectQualityIndex.js"
import type { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"

export type EffectQualityRuleFindingSource = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
) => ReadonlyArray<EffectQualityRuleFinding>

export class EffectQualityRuleProjection {
  constructor(
    readonly syntaxKinds: ReadonlyArray<ts.SyntaxKind>,
    readonly findings: EffectQualityRuleFindingSource
  ) {}
}
