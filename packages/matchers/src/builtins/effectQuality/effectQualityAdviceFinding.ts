import { Data } from "effect"

import * as ts from "typescript"

import type { EffectQualityAdviceKind } from "./effectQualityAdviceKind.js"

// Advice findings keep live AST nodes because Schema records cannot hold checker identity.
export class EffectQualityAdviceFinding extends Data.Class<{
  readonly kind: EffectQualityAdviceKind
  readonly node: ts.Node
  readonly subject: string
}> {}
