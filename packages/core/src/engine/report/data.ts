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

// ReportBlock carries the key and text because each report is a complete snapshot.
export const ReportBlock = Schema.Struct({
  key: reportKeySchema,
  text: Schema.String
})

export interface ReportBlock extends Schema.Schema.Type<typeof ReportBlock> {}

// SignalEvent is one tagged wire signal shape because NDJSON and pretty share it.
export const SignalEvent = Schema.TaggedStruct("signal", {
  key: reportKeySchema,
  text: Schema.String
})

export interface SignalEvent extends Schema.Schema.Type<typeof SignalEvent> {}

// EmptyReportEvent is the shared rootPath contract because its owners must agree.
export const EmptyReportEvent = Schema.TaggedStruct("empty", {
  rootPath: Schema.String
})

export interface EmptyReportEvent extends Schema.Schema.Type<typeof EmptyReportEvent> {}

// ReportEvent is one signal/empty union because each run emits a complete snapshot.
export type ReportEvent = SignalEvent | EmptyReportEvent
