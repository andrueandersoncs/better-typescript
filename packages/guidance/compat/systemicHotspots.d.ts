import { Schema } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import type { RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"
export declare const SystemicSignals: Schema.Struct<{
  readonly hotSubsystem: Schema.$Array<typeof Advice>
  readonly highSignalDensity: Schema.$Array<typeof Advice>
}>
export interface SystemicSignals extends Schema.Schema.Type<typeof SystemicSignals> {}
export declare const systemicHotspotsExamples: RefactorExampleSource
export declare const systemicHotspots: (signals: SystemicSignals) => ReadonlyArray<Advice>
