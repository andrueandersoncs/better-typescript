interface User {
  readonly id: string
  readonly active: boolean
  readonly role: string
}

export const countUsers = (users: ReadonlyArray<User>): string => String(users.length)

export const filterActiveUsers = (users: ReadonlyArray<User>): User =>
  users.find((user) => user.active) ?? users[0]!

export const groupUsersByRole = (users: ReadonlyArray<User>): ReadonlyArray<User> => users

export const headUser = (users: ReadonlyArray<User>): User => users[0]!
