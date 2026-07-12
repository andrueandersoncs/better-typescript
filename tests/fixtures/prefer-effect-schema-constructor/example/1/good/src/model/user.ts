import { Schema } from "effect"

class User extends Schema.TaggedClass<User>()("User", {
  name: Schema.String,
  createdAt: Schema.Number
}) {}

export const createUser = (name: string) => {
  const createdAt = Date.now()

  return new User({ name, createdAt })
}
