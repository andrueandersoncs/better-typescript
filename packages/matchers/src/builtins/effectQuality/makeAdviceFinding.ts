import * as ts from "typescript"

import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"

import type { EffectQualityAdviceData } from "./effectQualityAdviceData.js"

export const makeAdviceFinding =
  (kind: EffectQualityAdviceData["kind"]) =>
  (subject: string) =>
  (node: ts.Node): EffectQualityAdviceFinding =>
    new EffectQualityAdviceFinding({
      kind,
      node,
      subject
    })
