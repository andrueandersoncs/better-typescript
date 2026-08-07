import { Match, Struct, pipe } from "effect"
import type { EmptyReportEvent } from "./emptyReportEvent.js"
import type { ReportEvent } from "./reportEvent.js"
import type { SignalEvent } from "./signalEvent.js"

const emptyReportText = (event: EmptyReportEvent) => `No signals in ${event.rootPath}.`

// Kept separate from NDJSON because --pretty needs a human-readable event projection.
export const renderEventText = (event: ReportEvent) =>
  pipe(
    Match.value(event),
    Match.tag("signal", Struct.get<SignalEvent, "text">("text")),
    Match.tag("empty", emptyReportText),
    Match.exhaustive
  )
