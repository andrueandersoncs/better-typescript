import * as ts from "typescript"

import type { MatchContext } from "../../matcher/matchContext.js"

import { EffectQualityIndex } from "./effectQualityIndex.js"

import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"

export type RuleFindingSource = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
) => ReadonlyArray<EffectQualityRuleFinding>
