import { Schema } from "effect"

// Allowed: Schema.TaggedClass
export class MyEvent extends Schema.TaggedClass<MyEvent>()("MyEvent", {
  payload: Schema.String
}) {}

// Allowed: Schema.TaggedError
export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  { message: Schema.String }
) {}

// Allowed: Schema.Class (not tagged)
export class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {}
