interface User {
  readonly active: boolean
  readonly id: string
  readonly role: string
}

export const countUsers = (users: ReadonlyArray<User>): number => users.length

export const averageAge = (ages: ReadonlyArray<number>): number =>
  ages.reduce((total, age) => total + age, 0) / ages.length

export const sumScores = (scores: ReadonlyArray<number>): number =>
  scores.reduce((total, score) => total + score, 0)

export const filterActiveUsers = (users: ReadonlyArray<User>): ReadonlyArray<User> =>
  users.filter((user) => user.active)

export const mapUsers = (users: ReadonlyArray<User>): ReadonlyArray<User> =>
  users.map((user) => user)

export const groupUsersByRole = (
  users: ReadonlyArray<User>
): Record<string, ReadonlyArray<User>> =>
  users.reduce<Record<string, Array<User>>>((groups, user) => {
    const current = groups[user.role] ?? []
    current.push(user)
    groups[user.role] = current
    return groups
  }, {})

export const indexUsers = (users: ReadonlyArray<User>): Record<string, User> =>
  users.reduce<Record<string, User>>((index, user) => {
    index[user.id] = user
    return index
  }, {})

// Ambiguous or unrecognized operation words stay clean.
export const resolveCount = (users: ReadonlyArray<User>): number => users.length

export const headUser = (users: ReadonlyArray<User>): User => users[0]!

export const totalItems = (users: ReadonlyArray<User>): User => users[0]!

export const sizeUsers = (users: ReadonlyArray<User>): boolean => users.length > 0

export const findUsers = (users: ReadonlyArray<User>): ReadonlyArray<User> => users
