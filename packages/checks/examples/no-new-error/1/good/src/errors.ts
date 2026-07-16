import { Schema } from "effect"

class NotFound extends Schema.TaggedErrorClass<NotFound>()("NotFound", {}) {}

export const err = new NotFound()
