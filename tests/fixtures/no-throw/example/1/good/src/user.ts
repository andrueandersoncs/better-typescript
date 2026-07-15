import { Effect, Schema } from "effect"

class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()(
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
