import { Array } from "effect"
import type * as ts from "typescript"
import type { EffectQualityAdviceKind, EffectQualityRuleKind } from "./data.js"
import { EffectQualityAdviceFinding, EffectQualityRuleFinding } from "./findings.js"

export const emptyRuleFindings: ReadonlyArray<EffectQualityRuleFinding> = Array.empty()

export const emptyAdviceFindings: ReadonlyArray<EffectQualityAdviceFinding> = Array.empty()

export const makeRuleFinding =
  (kind: EffectQualityRuleKind) =>
  (subject: string) =>
  (node: ts.Node): EffectQualityRuleFinding =>
    new EffectQualityRuleFinding({
      kind,
      node,
      subject
    })

export const makeAdviceFinding =
  (kind: EffectQualityAdviceKind) =>
  (subject: string) =>
  (node: ts.Node): EffectQualityAdviceFinding =>
    new EffectQualityAdviceFinding({
      kind,
      node,
      subject
    })
