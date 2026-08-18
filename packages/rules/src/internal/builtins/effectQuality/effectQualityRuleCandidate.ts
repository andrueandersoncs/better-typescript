import { Data } from "effect"
import type * as ts from "typescript"
import type { EffectQualityRuleData } from "./effectQualityRuleData.js"

// EffectQualityRuleCandidate exists because its fields form one stable data contract used by the linter.
export class EffectQualityRuleCandidate extends Data.Class<{
  readonly kind: EffectQualityRuleData["kind"]
  readonly node: ts.Node
  readonly subject: string
}> {}
