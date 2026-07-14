/**
 * ReportSnapshot carries stable internal identity alongside the public report fields.
 *
 * @modelRole shared
 * @remarks Exists because delta tracking and event projection consume different parts
 * of one report snapshot. Removing it would split the internal identity from the text
 * it identifies and require callers to keep parallel values synchronized.
 */
export interface ReportSnapshot {
  readonly snapshotIdentity: string
  readonly reportKey: string
  readonly reportText: string
}

/**
 * PublishedReportEvent is the public key and text projected from an internal snapshot.
 *
 * @modelRole shared
 * @remarks Exists because event publication and rendering share a stable public shape
 * that intentionally excludes internal identity. Removing it would expose tracking
 * state or duplicate the projection contract in both consumers.
 */
export interface PublishedReportEvent {
  readonly reportKey: string
  readonly reportText: string
}
