import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {}

export const greet = (user: User): string => `Hello, ${user.name}`
