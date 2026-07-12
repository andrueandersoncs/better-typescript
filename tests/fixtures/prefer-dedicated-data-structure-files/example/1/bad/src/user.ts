import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {}

export const renameUser = (name: string, user: User): User =>
  User.make({ ...user, name })
