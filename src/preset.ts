import { reportFromWiring } from "./detectors/report.js"
import { watchReportFromWiring } from "./detectors/watch.js"
import { defaultWiring } from "./preset/defaultWiring.js"

export * as advice from "./advice/index.js"
export * as rules from "./rules/index.js"
export { preferCurriedDataLastFunctions } from "./advice/preferCurriedDataLastFunctions.js"
export {
  defaultAdvice,
  defaultWiring,
  helperRules,
  reportedRules
} from "./preset/defaultWiring.js"

export const report = reportFromWiring(defaultWiring)
export const watchReport = watchReportFromWiring(defaultWiring)
