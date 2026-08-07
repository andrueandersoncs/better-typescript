import { Array, Schema } from "effect"
import { AdviceReportKey } from "./adviceReportKey.js"
import { RuleReportKey } from "./ruleReportKey.js"

const reportKeyMembers = Array.make(AdviceReportKey, RuleReportKey)

// reportKeySchema is the runtime codec for ReportKey because blocks and events validate it.
export const reportKeySchema = Schema.Union(reportKeyMembers)
