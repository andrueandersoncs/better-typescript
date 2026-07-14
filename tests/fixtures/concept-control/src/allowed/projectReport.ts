import type {
  PublishedReportEvent,
  ReportSnapshot
} from "./projectionData.js"

export const publishReport = (
  snapshot: ReportSnapshot
): PublishedReportEvent => ({
  reportKey: snapshot.reportKey,
  reportText: snapshot.reportText
})

export const snapshotIdentity = (snapshot: ReportSnapshot): string =>
  snapshot.snapshotIdentity

export const renderPublishedReport = (
  event: PublishedReportEvent
): string => `${event.reportKey}: ${event.reportText}`
