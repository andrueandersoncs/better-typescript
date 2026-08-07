import { Data } from "effect"

import * as ts from "typescript"

import type { EffectQualityRuleKind } from "./effectQualityRuleKind.js"

// Rule findings keep live AST nodes because Schema records cannot hold checker identity.
export class EffectQualityRuleFinding extends Data.Class<{
  readonly kind: EffectQualityRuleKind
  readonly node: ts.Node
  readonly subject: string
}> {}
