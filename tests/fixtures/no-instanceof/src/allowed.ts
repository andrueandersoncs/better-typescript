import { Schema } from "effect"

const value: unknown = null

// Allowed: instanceof with built-in Error class (third-party)
export const isError = value instanceof Error

// Allowed: instanceof with built-in Date class (third-party)
export const isDate = value instanceof Date

// Allowed: Schema.is type guard (no instanceof)
class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  { message: Schema.String }
) {}

export const isNotFound = Schema.is(NotFoundError)(value)
