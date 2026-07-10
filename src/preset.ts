import { reportFromWiring } from "./engine/report.js"
import { watchReportFromWiring } from "./engine/watch.js"
import { defaultWiring } from "./preset/defaultWiring.js"

export * as checks from "./checks/index.js"
export {
  defaultChecks,
  defaultDerive,
  defaultWiring
} from "./preset/defaultWiring.js"

export const report = reportFromWiring(defaultWiring)
export const watchReport = watchReportFromWiring(defaultWiring)
