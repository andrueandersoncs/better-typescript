import type { Schema } from "effect"

export const isJsonArray = (value: Schema.Json): value is ReadonlyArray<Schema.Json> => {
  const arrayValue = globalThis.Array.isArray(value)
  return arrayValue
}
