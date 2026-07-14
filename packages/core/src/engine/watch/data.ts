import { Data, Schema } from "effect"
import type { ProgramContext } from "../sources/data.js"
import { reportKeySchema } from "../report/data.js"

/**
 * One consistent workspace-wide batch: every project's latest ProgramContext
 * in project index order, emitted only after every project has arrived.
 * @modelRole shared
 * @remarks Keeping contexts instead of materialized AST nodes lets the fused
 * dispatcher traverse each source file once without retaining node wrappers.
 * This model remains explicit because its consumers need the documented contract;
 * removing it would reintroduce that contract at each use site.
 */
export class WorkspaceUpdate extends Data.Class<{
  readonly rootPath: string
  readonly contexts: ReadonlyArray<ProgramContext>
}> {}

/**
 * One report event on the wire: a signal block appeared or changed its text
 * (signal), a block's signal went away (cleared), or the initial report found
 * nothing (empty). The default CLI output is NDJSON — JSON.stringify of these
 * events, one per line; --pretty renders them through renderEventText.
 * @modelRole shared
 * @remarks Tagged events are the wire vocabulary because NDJSON and --pretty
 * both project the same signal/cleared/empty shapes.
 * This model remains explicit because its consumers need the documented contract;
 * removing it would reintroduce that contract at each use site.
 */
export class SignalEvent extends Schema.TaggedClass<SignalEvent>()("signal", {
  key: reportKeySchema,
  text: Schema.String
}) {}

/**
 * ClearedEvent is the shared key, text contract used by ReportEvent and
 * blockClearedEvent.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class ClearedEvent extends Schema.TaggedClass<ClearedEvent>()(
  "cleared",
  {
    key: reportKeySchema,
    text: Schema.String
  }
) {}

/**
 * EmptyReportEvent is the shared rootPath contract used by ReportEvent,
 * initialReportEvents, and emptyReportText.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class EmptyReportEvent extends Schema.TaggedClass<EmptyReportEvent>()(
  "empty",
  {
    rootPath: Schema.String
  }
) {}

/**
 * ReportEvent is the shared ReportEvent values contract used by blockDeltas,
 * renderEventText, and reportEventsFromWorkspaceConfigs.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export type ReportEvent = SignalEvent | ClearedEvent | EmptyReportEvent
