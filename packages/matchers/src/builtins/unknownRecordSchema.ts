import { Schema } from "effect"

// unknownRecordSchema decodes free-form string-keyed maps because matchers accept opaque fact bags.
export const unknownRecordSchema = Schema.Record(Schema.String, Schema.Unknown)
export const decodeUnknownRecord = Schema.decodeUnknownOption(unknownRecordSchema)
