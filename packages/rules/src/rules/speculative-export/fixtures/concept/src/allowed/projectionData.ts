// ReportSnapshot keeps internal identity beside report text because delta tracking needs both.
export interface ReportSnapshot {
  readonly snapshotIdentity: string
  readonly reportKey: string
  readonly reportText: string
}

// PublishedReportEvent is the public projection because publication excludes internal identity.
export interface PublishedReportEvent {
  readonly reportKey: string
  readonly reportText: string
}
