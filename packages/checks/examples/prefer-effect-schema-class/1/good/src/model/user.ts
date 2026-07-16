import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  name: Schema.String,
  age: Schema.Number
}) {}
