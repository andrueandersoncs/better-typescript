import { Data } from "effect"
import type * as ts from "typescript"
import type { EffectQualityAdviceKind, EffectQualityRuleKind } from "./data.js"

// Rule findings keep live AST nodes because Schema records cannot hold checker identity.
export class EffectQualityRuleFinding extends Data.Class<{
  readonly kind: EffectQualityRuleKind
  readonly node: ts.Node
  readonly subject: string
}> {}

// Advice findings keep live AST nodes because Schema records cannot hold checker identity.
export class EffectQualityAdviceFinding extends Data.Class<{
  readonly kind: EffectQualityAdviceKind
  readonly node: ts.Node
  readonly subject: string
}> {}
