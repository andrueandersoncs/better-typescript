import { Schema } from "effect"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { EffectQualityAdviceData } from "@better-typescript/matchers/builtins/effectQuality/effectQualityAdviceData"
import type { EffectQualityAdviceKind } from "@better-typescript/matchers/builtins/effectQuality/effectQualityAdviceKind"

export const adviceKinds = (signals: ReadonlyArray<Signal>): ReadonlySet<EffectQualityAdviceKind> =>
  new Set(
    signals
      .filter((signal) => !signal.reported)
      .flatMap((signal) => signal.detections)
      .flatMap((detection) =>
        Schema.is(EffectQualityAdviceData)(detection.data) ? [detection.data.kind] : []
      )
  )
