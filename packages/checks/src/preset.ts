import { reportFromConfig } from "@better-typescript/core/engine/report"
import { watchReportFromConfig } from "@better-typescript/core/engine/watch"
import { defaultConfig } from "./preset/defaultWiring.js"

export const report = reportFromConfig(defaultConfig)
export const watchReport = watchReportFromConfig(defaultConfig)
