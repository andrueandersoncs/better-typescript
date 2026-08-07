import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { Signal } from "@better-typescript/core/engine/signal/data"

export const silentSignal = (name: string, detections: ReadonlyArray<Detection>): Signal =>
  new Signal({ name, reported: false, detections, examples: emptyRefactorExampleSource })
