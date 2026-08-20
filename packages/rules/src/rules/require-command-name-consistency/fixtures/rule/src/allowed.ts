import { Effect } from "effect"

interface User {
  readonly id: string
  readonly name: string
}

declare let writtenName: string
declare let publishedId: string

// Pure transforms without command verbs.
export const trimmedUser = (user: User): User => ({
  id: user.id,
  name: user.name.trim()
})

export const userLabel = (user: User): string => user.name.toUpperCase()

// True void commands with command language.
export const writeUserName = (user: User): void => {
  writtenName = user.name
}

export const saveUserRecord = (user: User): void => {
  writtenName = user.name
}

export const sendUserId = (user: User): void => {
  publishedId = user.id
}

export const publishUser = (user: User): void => {
  publishedId = user.id
}

// Predicate language must not be forced into command vocabulary.
export const isActiveUser = (user: User): boolean => user.name.length > 0

export const canPublishUser = (user: User): boolean => user.id.length > 0

// Neutral callback/handler nouns stay out of this check.
export const clickHandler = (user: User): void => {
  writtenName = user.name
}

export const saveCallback = (user: User): User => ({
  id: user.id,
  name: user.name.trim()
})

// Ordinary nouns and non-command result style without void command role.
export const userProfile = (user: User): User => user

export const selectedUserName = (user: User): string => user.name
declare const loadUserRecord: (user: User) => Effect.Effect<User>

// Value-bearing Effects may resolve data even when their implementation loads it.
export const resolveUser = (user: User): Effect.Effect<User> =>
  Effect.flatMap(loadUserRecord(user), Effect.succeed)

// Ambiguity guard: saved* is not the save command verb.
export const savedUser = (user: User): User => ({
  id: user.id,
  name: user.name
})

export class UserWriter {
  writeUserName(user: User): void {
    writtenName = user.name
  }

  userLabel(user: User): string {
    return user.name
  }
}
