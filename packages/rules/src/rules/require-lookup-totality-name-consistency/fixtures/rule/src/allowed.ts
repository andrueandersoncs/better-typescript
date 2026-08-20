import { Option } from "effect"

interface User {
  readonly id: string
  readonly name: string
}

declare const users: ReadonlyArray<User>

// Optional vocabulary with optional results.
export const findUser = (id: string): Option.Option<User> =>
  Option.fromNullishOr(users.find((user) => user.id === id))

export const lookupUser = (id: string): User | undefined =>
  users.find((user) => user.id === id)

export const maybeUser = (id: string): User | null =>
  users.find((user) => user.id === id) ?? null

export const optionalUser = (id: string): Option.Option<User> =>
  Option.fromNullishOr(users.find((user) => user.id === id))

// Total vocabulary with total results.
export const requireUser = (id: string): User => users[0]!

export const unsafeUser = (id: string): User => users.find((user) => user.id === id)!

export const getOrThrowUser = (id: string): User => users[0]!

export const getOrElseUser = (id: string, fallback: User): User =>
  users.find((user) => user.id === id) ?? fallback

// Neutral lookup vocabulary without totality claims — either shape is fine.
export const getUser = (id: string): User => users[0]!

export const userById = (id: string): Option.Option<User> =>
  Option.fromNullishOr(users.find((user) => user.id === id))

export const readUser = (id: string): User | undefined =>
  users.find((user) => user.id === id)

// Factory-style names are not optional-totality claims.
export const makeUser = (name: string): User => ({
  id: name,
  name
})

export class UserStore {
  findUser(id: string): Option.Option<User> {
    return Option.fromNullishOr(users.find((user) => user.id === id))
  }

  requireUser(id: string): User {
    return users[0]!
  }
}
