import { Array, Schema } from "effect"

// AdviceReportKey is one advice block's wire identity because NDJSON keys it.
export class AdviceReportKey extends Schema.TaggedClass<AdviceReportKey>()("advice", {
  level: Schema.String,
  path: Schema.String,
  title: Schema.String
}) {}

// RuleReportKey is one detection's wire identity because consumers key its tag.
export class RuleReportKey extends Schema.TaggedClass<RuleReportKey>()("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
}) {}

// ReportKey is the tagged identity for all report block kinds because consumers share it.
export type ReportKey = AdviceReportKey | RuleReportKey

const reportKeyMembers = Array.make(AdviceReportKey, RuleReportKey)

// reportKeySchema is the runtime codec for ReportKey because blocks and events validate it.
export const reportKeySchema = Schema.Union(reportKeyMembers)

// ReportBlock carries identity, key, and text because delta and wire need different views.
export class ReportBlock extends Schema.Class<ReportBlock>("ReportBlock")({
  identity: Schema.String,
  key: reportKeySchema,
  text: Schema.String,
  cleared: Schema.String
}) {}

// SignalEvent is one tagged wire signal shape because NDJSON and pretty share it.
export class SignalEvent extends Schema.TaggedClass<SignalEvent>()("signal", {
  key: reportKeySchema,
  text: Schema.String
}) {}

// ClearedEvent is the shared key/text contract because its owners must agree.
export class ClearedEvent extends Schema.TaggedClass<ClearedEvent>()("cleared", {
  key: reportKeySchema,
  text: Schema.String
}) {}

// EmptyReportEvent is the shared rootPath contract because its owners must agree.
export class EmptyReportEvent extends Schema.TaggedClass<EmptyReportEvent>()("empty", {
  rootPath: Schema.String
}) {}

// ReportEvent is one signal/cleared/empty union because its owners must agree.
export type ReportEvent = SignalEvent | ClearedEvent | EmptyReportEvent
