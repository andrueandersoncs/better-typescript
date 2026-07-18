import { Schema } from "effect"

const User = Schema.TaggedStruct("User", {
  name: Schema.String,
  createdAt: Schema.Number
})
interface User extends Schema.Schema.Type<typeof User> {}

export const createUser = (name: string) => {
  const createdAt = Date.now()

  return User.make({ name, createdAt })
}
