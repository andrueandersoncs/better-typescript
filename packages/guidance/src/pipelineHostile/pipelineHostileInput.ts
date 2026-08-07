import { Data } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"

// Complete nested-call detection pair because advisers consume one finished batch.
export class PipelineHostileInput extends Data.Class<{
  readonly noNestedCalls: ReadonlyArray<Detection>
  readonly preferCurriedDataLastFunctions: ReadonlyArray<Detection>
}> {}
