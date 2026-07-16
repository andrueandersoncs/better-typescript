import { Array, Schema } from "effect"

/**
 * AdviceReportKey is the stable wire identity for one aggregate advice block.
 *
 * @remarks
 *   It remains explicit because NDJSON and delta consumers key advice blocks by
 *   the same tagged fields. Removing it would duplicate wire identity
 *   construction and parsing at every producer and consumer.
 * @modelRole protocol
 */
export class AdviceReportKey extends Schema.TaggedClass<AdviceReportKey>()("advice", {
  level: Schema.String,
  path: Schema.String,
  title: Schema.String
}) {}

/**
 * RuleReportKey is the stable wire identity for one local detection block.
 *
 * @remarks
 *   The wire tag remains `rule` because existing report consumers depend on it
 *   while checks remain the engine model. Removing the named protocol would
 *   duplicate its compatibility contract at every event schema and renderer.
 * @modelRole protocol
 */
export class RuleReportKey extends Schema.TaggedClass<RuleReportKey>()("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
}) {}

/**
 * ReportKey is the tagged identity protocol shared by all report block kinds.
 *
 * @remarks
 *   It remains explicit because block construction, event schemas, and renderers
 *   must exhaust the same key variants. Removing it would repeat the union and
 *   allow consumers to accept different report identities.
 * @modelRole protocol
 */
export type ReportKey = AdviceReportKey | RuleReportKey

const reportKeyMembers = Array.make(AdviceReportKey, RuleReportKey)

/**
 * ReportKeySchema is the runtime codec for the ReportKey wire boundary.
 *
 * @remarks
 *   It remains explicit because report blocks and watch events must validate the
 *   same tagged union. Removing it would duplicate schema assembly and let
 *   runtime validation drift from the TypeScript contract.
 * @modelRole boundary
 */
export const reportKeySchema = Schema.Union(reportKeyMembers)

/**
 * ReportBlock carries one rendered block and both identities needed for stable
 * delta updates and NDJSON output.
 *
 * @remarks
 *   It remains explicit because delta comparison, rendering, and wire events need
 *   different projections of the same block. Removing it would split those
 *   correlated values and duplicate projection logic across the pipeline.
 * @modelRole boundary
 */
export class ReportBlock extends Schema.Class<ReportBlock>("ReportBlock")({
  identity: Schema.String,
  key: reportKeySchema,
  text: Schema.String,
  cleared: Schema.String
}) {}

/**
 * One report event on the wire: a signal block appeared or changed its text
 * (signal), a block's signal went away (cleared), or the initial report found
 * nothing (empty). The default CLI output is NDJSON — JSON.stringify of these
 * events, one per line; --pretty renders them through renderEventText.
 *
 * @remarks
 *   Tagged events are the wire vocabulary because NDJSON and --pretty both
 *   project the same signal/cleared/empty shapes. This model remains explicit
 *   because its consumers need the documented contract; removing it would
 *   reintroduce that contract at each use site.
 * @modelRole shared
 */
export class SignalEvent extends Schema.TaggedClass<SignalEvent>()("signal", {
  key: reportKeySchema,
  text: Schema.String
}) {}

/**
 * ClearedEvent is the shared key, text contract used by ReportEvent and
 * blockClearedEvent.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class ClearedEvent extends Schema.TaggedClass<ClearedEvent>()("cleared", {
  key: reportKeySchema,
  text: Schema.String
}) {}

/**
 * EmptyReportEvent is the shared rootPath contract used by ReportEvent,
 * initialReportEvents, and emptyReportText.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class EmptyReportEvent extends Schema.TaggedClass<EmptyReportEvent>()("empty", {
  rootPath: Schema.String
}) {}

/**
 * ReportEvent is the wire event union shared by initialReportEvents,
 * renderEventText, and reportEvents.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export type ReportEvent = SignalEvent | ClearedEvent | EmptyReportEvent
