import { Data } from "effect"

import * as ts from "typescript"

import type { EffectQualityAdviceData } from "./effectQualityAdviceData.js"

// Advice findings keep live AST nodes because Schema records cannot hold checker identity.
export class EffectQualityAdviceFinding extends Data.Class<{
  readonly kind: EffectQualityAdviceData["kind"]
  readonly node: ts.Node
  readonly subject: string
}> {}
