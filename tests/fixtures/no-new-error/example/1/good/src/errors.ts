import { Schema } from "effect"

class NotFound extends Schema.TaggedError<NotFound>("NotFound")(
  "NotFound",
  {}
) {}

export const err = new NotFound()
