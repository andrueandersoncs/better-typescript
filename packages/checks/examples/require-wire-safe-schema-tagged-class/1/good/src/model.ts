import { Schema } from "effect"

export class ScheduledEvent extends Schema.TaggedClass<ScheduledEvent>()("ScheduledEvent", {
  createdAt: Schema.DateFromString
}) {}
