interface User {
  readonly id: string
  readonly name: string
  readonly active: boolean
}

interface Absent {
  readonly _tag: "Absent"
}

type Present<A> =
  | Absent
  | {
      readonly _tag: "Present"
      readonly value: A
    }

const present = <A>(value: A): Present<A> => ({ _tag: "Present", value })

export const isUser = (id: string): User => ({ // ~detect 14
  id,
  active: true,
  name: "anonymous"
})

export const hasUserName = (user: User): string => user.name // ~detect 14

export const canActivate = (user: User): User => ({ // ~detect 14
  ...user,
  active: true
})

export const containsName = (user: User): Present<string> => present(user.name) // ~detect 14

export const startsWithPrefix = (value: string): string => value // ~detect 14

export const endsWithSuffix = (value: string): number => value.length // ~detect 14

export const getUser = (user: User): boolean => user.name.length > 0 // ~detect 14

export const makeActive = (user: User): boolean => user.active // ~detect 14

export const findReady = (user: User): boolean => user.active // ~detect 14

export const createFlag = (user: User): boolean => user.id.length > 0 // ~detect 14

export function isActiveUser(user: User): User { // ~detect 17
  return user
}

export class UserQueries {
  isReady(user: User): User { // ~detect 3
    return user
  }

  loadReady(user: User): boolean { // ~detect 3
    return user.active
  }
}
