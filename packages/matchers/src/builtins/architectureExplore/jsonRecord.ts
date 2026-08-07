import type { Schema } from "effect"

// JsonRecord is a string-keyed Json object because freeze walks evidence without decoding.
export type JsonRecord = { readonly [key: string]: Schema.Json }
