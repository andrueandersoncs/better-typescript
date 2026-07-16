import { Data, Schema } from "effect"
import type { ProgramContext } from "../sources/data.js"
import { reportKeySchema } from "../report/data.js"

// WorkspaceUpdate is one workspace batch because consumers need that contract.
export class WorkspaceUpdate extends Data.Class<{
  readonly rootPath: string
  readonly contexts: ReadonlyArray<ProgramContext>
}> {}

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
