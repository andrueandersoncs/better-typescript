import { Effect, Schema } from "effect"

class UserNotFound extends Schema.TaggedError<UserNotFound>("UserNotFound")(
  "UserNotFound",
  {}
) {}

export const requireName = Effect.fn("requireName")(function* (
  name: string | null
) {
  if (name === null) {
    return yield* new UserNotFound()
  }

  return name
})
