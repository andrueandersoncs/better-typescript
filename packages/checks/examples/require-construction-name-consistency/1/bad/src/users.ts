interface User {
  readonly id: string
  readonly name: string
}

declare const users: ReadonlyArray<User>

export const makeUser = (id: string): User => users.find((user) => user.id === id)!

export const user = (name: string): User => ({
  id: name,
  name
})
