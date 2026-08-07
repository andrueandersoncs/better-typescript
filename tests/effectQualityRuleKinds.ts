import { Schema } from "effect"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { EffectQualityRuleData } from "@better-typescript/matchers/builtins/effectQuality/effectQualityRuleData"
import type { EffectQualityRuleKind } from "@better-typescript/matchers/builtins/effectQuality/effectQualityRuleKind"

export const ruleKinds = (signals: ReadonlyArray<Signal>): ReadonlySet<EffectQualityRuleKind> =>
  new Set(
    signals
      .filter((signal) => signal.reported)
      .flatMap((signal) => signal.detections)
      .flatMap((detection) =>
        Schema.is(EffectQualityRuleData)(detection.data) ? [detection.data.kind] : []
      )
  )
