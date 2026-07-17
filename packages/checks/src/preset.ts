import { Effect, pipe } from "effect"
import { reportEvents } from "@better-typescript/core/engine/watch"
import { defaultConfig } from "./preset/defaultWiring.js"

export const report = pipe(defaultConfig, Effect.map(reportEvents))
