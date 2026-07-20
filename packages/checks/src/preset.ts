import { Effect } from "effect"
import { reportEvents } from "@better-typescript/core/engine/watch"
import { defaultConfig } from "./preset/defaultWiring.js"

export const report = Effect.fn("Preset.report")(reportEvents(defaultConfig))
