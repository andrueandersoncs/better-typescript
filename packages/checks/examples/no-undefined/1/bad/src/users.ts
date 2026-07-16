interface User {
  readonly id: string
  readonly name: string
}

declare const users: ReadonlyArray<User>

export const findUser = (id: string): User | undefined => users.find((u) => u.id === id)
