import { makeReportEvent } from "@better-typescript/core/engine/watch"
import { defaultConfig } from "./preset/defaultWiring.js"

export const report = makeReportEvent(defaultConfig)
