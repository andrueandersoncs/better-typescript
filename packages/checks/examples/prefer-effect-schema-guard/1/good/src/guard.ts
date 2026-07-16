import { Schema } from "effect"

class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {}

export const readName = (value: unknown) => {
  if (Schema.is(User)(value)) {
    return value.name
  }
}
