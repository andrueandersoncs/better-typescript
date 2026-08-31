import { Schema } from "effect"
import { decodeUnknownSync as localDecode } from "./effect/Schema"
declare const value: unknown
declare const schema: unknown
export const decoded = Schema.decodeUnknown(schema)(value)
export const localImport = localDecode(schema)(value)

const localSchema = { decodeUnknownSync: (input: unknown) => input }
export const local = localSchema.decodeUnknownSync(value)
