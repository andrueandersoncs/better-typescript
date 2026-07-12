export interface User {
  readonly id: string
  readonly name: string
}

export const updateUser = (id: string, newData: User): User => ({
  ...newData,
  id
})
