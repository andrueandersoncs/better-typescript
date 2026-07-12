import { reportFromWiring } from "@better-typescript/core/engine/report"
import { watchReportFromWiring } from "@better-typescript/core/engine/watch"
import { defaultWiring } from "./preset/defaultWiring.js"

export const report = reportFromWiring(defaultWiring)
export const watchReport = watchReportFromWiring(defaultWiring)
