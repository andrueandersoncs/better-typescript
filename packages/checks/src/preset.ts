import { Effect } from "effect"
import { makeReportEvent } from "@better-typescript/core/engine/watch"
import { defaultConfig } from "./preset/defaultWiring.js"

export const report = Effect.fn("Preset.report")(function* () {
  return yield* makeReportEvent(defaultConfig)
})
