import * as Effect from "effect/Effect"

export interface ReportSummary {
  readonly reportId: string
  readonly title: string
}

export const summarizeReport = (reportId: string, title: string) =>
  Effect.succeed<ReportSummary>({ reportId, title: title.trim() })

export const summaryColumns = ["reportId", "title"] as const
export const reportCollection = "reports"
export const reportSummaryVersion = 1
