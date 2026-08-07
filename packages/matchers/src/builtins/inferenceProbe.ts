import * as ts from "typescript"
import type { PreferInferredTypesKind } from "./preferInferredTypesKind.js"

// InferenceProbe pairs source syntax with shadow declarations because both identify one finding.
export class InferenceProbe {
  constructor(
    readonly detectionNode: ts.Node,
    readonly insertionPosition: number,
    readonly snippet: string,
    readonly kind: PreferInferredTypesKind
  ) {}
}
