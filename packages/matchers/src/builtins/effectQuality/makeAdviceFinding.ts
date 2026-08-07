import * as ts from "typescript"

import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"

import type { EffectQualityAdviceKind } from "./effectQualityAdviceKind.js"

export const makeAdviceFinding =
  (kind: EffectQualityAdviceKind) =>
  (subject: string) =>
  (node: ts.Node): EffectQualityAdviceFinding =>
    new EffectQualityAdviceFinding({
      kind,
      node,
      subject
    })
