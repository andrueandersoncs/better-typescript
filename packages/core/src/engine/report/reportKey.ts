import type { AdviceReportKey } from "./adviceReportKey.js"
import type { RuleReportKey } from "./ruleReportKey.js"

// ReportKey is the tagged identity for all report block kinds because consumers share it.
export type ReportKey = AdviceReportKey | RuleReportKey
