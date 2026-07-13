import { Chunk, Data, Schema } from "effect"
import type { AstNodeElement } from "../sources/data.js"
import { reportKeySchema } from "../report/data.js"

/**
 * One consistent workspace-wide snapshot batch: every project's node snapshot
 * in project index order, emitted only after source-update quiet/warm gating.
 * @remarks Quiet/warm gating is required because downstream stages must see
 * one consistent workspace snapshot, not a torn partial update.
 */
export class WorkspaceUpdate extends Data.Class<{
  readonly rootPath: string
  readonly snapshots: ReadonlyArray<Chunk.Chunk<AstNodeElement>>
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
