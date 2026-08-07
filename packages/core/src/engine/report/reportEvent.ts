import type { EmptyReportEvent } from "./emptyReportEvent.js"
import type { SignalEvent } from "./signalEvent.js"

// ReportEvent is one signal/empty union because each run emits a complete snapshot.
export type ReportEvent = SignalEvent | EmptyReportEvent
