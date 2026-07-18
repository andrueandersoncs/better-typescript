import { Schema } from "effect"

export const User = Schema.Struct({
  name: Schema.String,
  age: Schema.Number
})
export interface User extends Schema.Schema.Type<typeof User> {}
