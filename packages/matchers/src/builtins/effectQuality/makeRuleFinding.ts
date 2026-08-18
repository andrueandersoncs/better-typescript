import * as ts from "typescript"

import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"

import type { EffectQualityRuleData } from "./effectQualityRuleData.js"

export const makeRuleFinding =
  (kind: EffectQualityRuleData["kind"]) =>
  (subject: string) =>
  (node: ts.Node): EffectQualityRuleFinding =>
    new EffectQualityRuleFinding({
      kind,
      node,
      subject
    })
