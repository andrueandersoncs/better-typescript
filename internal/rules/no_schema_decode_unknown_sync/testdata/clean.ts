import { Schema } from "effect"
import { decodeUnknownSync as localDecode } from "./effect/Schema"
declare const value: unknown
declare const schema: Schema.ConstraintDecoder<unknown>
export const decoded = Schema.decodeUnknownEffect(schema)(value)
export const localImport = localDecode(schema)(value)

const localSchema = { decodeUnknownSync: (input: unknown) => input }
export const local = localSchema.decodeUnknownSync(value)
