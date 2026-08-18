import { Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import type { Advice } from "@better-typescript/core/engine/derive/advice"
import type { RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"
export declare const PipelineSignals: Schema.Struct<{
  readonly noNestedCalls: Schema.$Array<typeof Detection>
  readonly preferCurriedDataLastFunctions: Schema.$Array<typeof Detection>
}>
export interface PipelineSignals extends Schema.Schema.Type<typeof PipelineSignals> {}
export declare const pipelineHostileExamples: RefactorExampleSource
export declare const pipelineHostile: (signals: PipelineSignals) => ReadonlyArray<Advice>
