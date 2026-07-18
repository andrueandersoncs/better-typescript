import { Array, Schema } from "effect"

// AdviceReportKey is one advice block's wire identity because NDJSON keys it.
export const AdviceReportKey = Schema.TaggedStruct("advice", {
  level: Schema.String,
  path: Schema.String,
  title: Schema.String
})

export interface AdviceReportKey extends Schema.Schema.Type<typeof AdviceReportKey> {}

// RuleReportKey is one detection's wire identity because consumers key its tag.
export const RuleReportKey = Schema.TaggedStruct("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
})

export interface RuleReportKey extends Schema.Schema.Type<typeof RuleReportKey> {}

// ReportKey is the tagged identity for all report block kinds because consumers share it.
export type ReportKey = AdviceReportKey | RuleReportKey

const reportKeyMembers = Array.make(AdviceReportKey, RuleReportKey)

// reportKeySchema is the runtime codec for ReportKey because blocks and events validate it.
export const reportKeySchema = Schema.Union(reportKeyMembers)

// ReportBlock carries identity, key, and text because delta and wire need different views.
export const ReportBlock = Schema.Struct({
  identity: Schema.String,
  key: reportKeySchema,
  text: Schema.String,
  cleared: Schema.String
})

export interface ReportBlock extends Schema.Schema.Type<typeof ReportBlock> {}

// SignalEvent is one tagged wire signal shape because NDJSON and pretty share it.
export const SignalEvent = Schema.TaggedStruct("signal", {
  key: reportKeySchema,
  text: Schema.String
})

export interface SignalEvent extends Schema.Schema.Type<typeof SignalEvent> {}

// ClearedEvent is the shared key/text contract because its owners must agree.
export const ClearedEvent = Schema.TaggedStruct("cleared", {
  key: reportKeySchema,
  text: Schema.String
})

export interface ClearedEvent extends Schema.Schema.Type<typeof ClearedEvent> {}

// EmptyReportEvent is the shared rootPath contract because its owners must agree.
export const EmptyReportEvent = Schema.TaggedStruct("empty", {
  rootPath: Schema.String
})

export interface EmptyReportEvent extends Schema.Schema.Type<typeof EmptyReportEvent> {}

// ReportEvent is one signal/cleared/empty union because its owners must agree.
export type ReportEvent = SignalEvent | ClearedEvent | EmptyReportEvent
