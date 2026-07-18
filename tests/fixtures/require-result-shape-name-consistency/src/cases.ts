interface User {
  readonly active: boolean
  readonly id: string
  readonly role: string
}

export const countUsers = (users: ReadonlyArray<User>): string => String(users.length) // ~detect 14

export const averageAge = (ages: ReadonlyArray<number>): string => "0" // ~detect 14

export const sumScores = (scores: ReadonlyArray<number>): string => "0" // ~detect 14

export const filterActiveUsers = (users: ReadonlyArray<User>): User => // ~detect 14
  users.find((user) => user.active) ?? users[0]!

export const mapUsers = (users: ReadonlyArray<User>): number => users.length // ~detect 14

export const groupUsersByRole = (users: ReadonlyArray<User>): ReadonlyArray<User> => users // ~detect 14

export const indexUsers = (users: ReadonlyArray<User>): ReadonlyArray<User> => users // ~detect 14

export function countUsersByRole(users: ReadonlyArray<User>): string { // ~detect 17
  return String(users.length)
}

export class UserStats {
  countUsers(users: ReadonlyArray<User>): string { // ~detect 3
    return String(users.length)
  }

  filterActiveUsers(users: ReadonlyArray<User>): User { // ~detect 3
    return users[0]!
  }
}
