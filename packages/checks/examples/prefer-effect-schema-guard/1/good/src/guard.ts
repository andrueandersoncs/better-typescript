import { Schema } from "effect"

const User = Schema.Struct({
  name: Schema.String
})
interface User extends Schema.Schema.Type<typeof User> {}

export const readName = (value: unknown) => {
  if (Schema.is(User)(value)) {
    return value.name
  }
}
