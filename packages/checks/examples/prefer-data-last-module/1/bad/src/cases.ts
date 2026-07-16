import type { User } from "./modules/user.js"

export const updateUser = (id: string, newData: User): User => ({
  ...newData,
  id
})
