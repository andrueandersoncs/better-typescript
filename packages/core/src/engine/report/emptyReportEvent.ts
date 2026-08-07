import { Schema } from "effect"

// EmptyReportEvent is the shared rootPath contract because its owners must agree.
export const EmptyReportEvent = Schema.TaggedStruct("empty", {
  rootPath: Schema.String
})

export interface EmptyReportEvent extends Schema.Schema.Type<typeof EmptyReportEvent> {}
