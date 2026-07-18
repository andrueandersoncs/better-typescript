import { Option } from "effect"

interface User {
  readonly id: string
  readonly name: string
}

declare const users: ReadonlyArray<User>

// Optional vocabulary returning total data.
export const findUser = (id: string): User => users[0]! // ~detect 14

export const lookupUser = (id: string): User => users.find((user) => user.id === id)! // ~detect 14

export const maybeUser = (id: string): User => users[0]! // ~detect 14

export const optionalUser = (id: string): User => // ~detect 14
  users.find((user) => user.id === id) ?? { id, name: "fallback" }

// Total vocabulary returning optional data.
export const requireUser = (id: string): Option.Option<User> => // ~detect 14
  Option.fromNullishOr(users.find((user) => user.id === id))

export const unsafeUser = (id: string): User | undefined => // ~detect 14
  users.find((user) => user.id === id)

export const getOrThrowUser = (id: string): Option.Option<User> => // ~detect 14
  Option.fromNullishOr(users.find((user) => user.id === id))

export const getOrElseUser = (id: string): User | null => // ~detect 14
  users.find((user) => user.id === id) ?? null

export function findActiveUser(id: string): User { // ~detect 17
  return users[0]!
}

export class UserStore {
  findUser(id: string): User { // ~detect 3
    return users[0]!
  }

  requireUser(id: string): Option.Option<User> { // ~detect 3
    return Option.fromNullishOr(users.find((user) => user.id === id))
  }
}
