import { Schema } from "effect"

class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
  "NotFoundError",
  {}
) {}

export const recover = (fallback: string) => (error: unknown) => {
  if (Schema.is(NotFoundError)(error)) {
    return fallback
  }
}
