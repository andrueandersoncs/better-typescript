import { Data } from "effect"

import * as ts from "typescript"

import type { EffectQualityRuleData } from "./effectQualityRuleData.js"

// Rule findings keep live AST nodes because Schema records cannot hold checker identity.
export class EffectQualityRuleFinding extends Data.Class<{
  readonly kind: EffectQualityRuleData["kind"]
  readonly node: ts.Node
  readonly subject: string
}> {}
