import type { User } from "./user.js"

export const updateUser = (id: string, newData: User): User => ({
  ...newData,
  id
})
