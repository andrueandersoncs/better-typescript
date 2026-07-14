import type { User } from "./user.js"

export const updateUser = (id: string, newData: User): User => ({
  ...newData,
  id
})

export const renameUser =
  (name: string) =>
  (user: User): User => ({
    ...user,
    name
  })
