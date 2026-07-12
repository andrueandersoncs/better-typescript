import { User } from "./user.js"

export const renameUser = (name: string, user: User): User =>
  User.make({ ...user, name })
