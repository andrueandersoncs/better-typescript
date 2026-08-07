import * as ts from "typescript"

import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"

import type { EffectQualityRuleKind } from "./effectQualityRuleKind.js"

export const makeRuleFinding =
  (kind: EffectQualityRuleKind) =>
  (subject: string) =>
  (node: ts.Node): EffectQualityRuleFinding =>
    new EffectQualityRuleFinding({
      kind,
      node,
      subject
    })
