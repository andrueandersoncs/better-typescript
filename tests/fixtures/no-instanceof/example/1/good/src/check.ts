import { Schema } from "effect"

class NotFoundError extends Schema.TaggedError<NotFoundError>("NotFoundError")(
  "NotFoundError",
  {}
) {}

export const recover = (fallback: string) => (error: unknown) => {
  if (Schema.is(NotFoundError)(error)) {
    return fallback
  }
}
