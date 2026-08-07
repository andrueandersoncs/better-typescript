import * as assert from "node:assert/strict"
import { Match as EffectMatch, pipe } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { detectionData } from "./semanticModulePlacementDetectionData.js"

const splitMessage = "This Semantic Module spans multiple Physical Modules."

const splitHint =
  "Keep every listed Code Entity in one Physical Module; the reporting anchor does not imply a destination or move direction."

const mixedMessage = "This Physical Module contains Code Entities from multiple Semantic Modules."

const mixedHint =
  "Separate the listed Semantic Modules without splitting their complete membership; no destination or move direction is inferred."

export const assertDetectionContract = (detection: Detection) => {
  const data = detectionData(detection)

  pipe(
    EffectMatch.value(data),
    EffectMatch.when({ _tag: "split-semantic-module" }, (split) => {
      assert.equal(detection.message, splitMessage)
      assert.equal(detection.hint, splitHint)
      assert.equal(split.modules.length, 1)
      assert.ok(detection.location.line >= 1)
      assert.ok(detection.location.column >= 1)
    }),
    EffectMatch.when({ _tag: "mixed-physical-module" }, (mixed) => {
      assert.equal(detection.message, mixedMessage)
      assert.equal(detection.hint, mixedHint)
      assert.ok(mixed.modules.length >= 2)
      assert.equal(detection.location.line, 1)
      assert.equal(detection.location.column, 1)
    }),
    EffectMatch.exhaustive
  )
}
