import { Schema } from "effect"

export class MyEvent extends Schema.TaggedClass<MyEvent>()("MyEvent", {
  payload: Schema.String
}) {}
