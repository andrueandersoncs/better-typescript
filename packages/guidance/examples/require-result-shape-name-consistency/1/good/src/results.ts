interface User {
  readonly id: string
  readonly active: boolean
  readonly role: string
}

export const countUsers = (users: ReadonlyArray<User>): number => users.length

export const filterActiveUsers = (users: ReadonlyArray<User>): ReadonlyArray<User> =>
  users.filter((user) => user.active)

export const groupUsersByRole = (users: ReadonlyArray<User>): Record<string, ReadonlyArray<User>> =>
  users.reduce<Record<string, Array<User>>>((groups, user) => {
    const current = groups[user.role] ?? []
    current.push(user)
    groups[user.role] = current
    return groups
  }, {})

export const headUser = (users: ReadonlyArray<User>): User | undefined => users[0]
