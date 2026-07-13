import { Data, Schema } from "effect"
import type { ProgramContext } from "../sources/data.js"
import { reportKeySchema } from "../report/data.js"

/**
 * One consistent workspace-wide batch: every project's latest ProgramContext
 * in project index order, emitted only after every project has arrived.
 * @remarks Keeping contexts instead of materialized AST nodes lets the fused
 * dispatcher traverse each source file once without retaining node wrappers.
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
 * @remarks Tagged events are the wire vocabulary because NDJSON and --pretty
 * both project the same signal/cleared/empty shapes.
 */
export class SignalEvent extends Schema.TaggedClass<SignalEvent>()("signal", {
  key: reportKeySchema,
  text: Schema.String
}) {}

export class ClearedEvent extends Schema.TaggedClass<ClearedEvent>()(
  "cleared",
  {
    key: reportKeySchema,
    text: Schema.String
  }
) {}

export class EmptyReportEvent extends Schema.TaggedClass<EmptyReportEvent>()(
  "empty",
  {
    rootPath: Schema.String
  }
) {}

export type ReportEvent = SignalEvent | ClearedEvent | EmptyReportEvent
