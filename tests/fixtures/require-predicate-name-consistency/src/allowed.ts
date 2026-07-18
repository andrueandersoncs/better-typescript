interface User {
  readonly id: string
  readonly name: string
  readonly active: boolean
}

interface Absent {
  readonly _tag: "None"
}

type Present<A> =
  | Absent
  | {
      readonly _tag: "Some"
      readonly value: A
    }

export const isUser = (value: unknown): value is User =>
  typeof value === "object" && value !== null && "id" in value

export const hasUserName = (user: User): boolean => user.name.length > 0

export const canActivate = (user: User): boolean => !user.active

export const containsName = (user: User, needle: string): boolean => user.name.includes(needle)

export const startsWithPrefix = (value: string, prefix: string): boolean => value.startsWith(prefix)

export const endsWithSuffix = (value: string, suffix: string): boolean => value.endsWith(suffix)

export const shouldPersist = (user: User): boolean => user.active

export const doesMatch = (left: string, right: string): boolean => left === right

export const existsIn = (users: ReadonlyArray<User>, id: string): boolean =>
  users.some((user) => user.id === id)

// Noun-only boolean: no predicate claim and no incompatible operation — allowed ambiguity.
export const wordsMatch = (left: string, right: string): boolean => left === right

export const activeUser = (user: User): boolean => user.active

export const ready = (user: User): boolean => user.active

// Ambiguous standalone predicate words are not treated as claims by themselves.
export const some = <A>(value: A): Present<A> => ({
  _tag: "Some",
  value
})

export const none = (): Present<never> => ({
  _tag: "None"
})

export const every = (users: ReadonlyArray<User>): ReadonlyArray<User> => users

export const matches = (left: string, right: string): boolean => left === right

// Non-boolean factory/lookup names stay out of predicate claims.
export const makeUser = (id: string): User => ({
  id,
  name: "anonymous",
  active: true
})

export const getUser = (users: ReadonlyArray<User>, id: string): User => users[0]!

export class UserQueries {
  isReady(user: User): boolean {
    return user.active
  }

  hasName(user: User): boolean {
    return user.name.length > 0
  }
}
