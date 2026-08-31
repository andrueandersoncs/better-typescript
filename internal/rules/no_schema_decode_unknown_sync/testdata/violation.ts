import { Schema as S } from "effect"
import { decodeUnknownSync as decode } from "effect/Schema"
declare const value: unknown
declare const schema: unknown
export const decoded = S.decodeUnknownSync(schema)(value)
export const directlyDecoded = decode(schema)(value)
export const elementDecoded = S["decodeUnknownSync"](schema)(value)
