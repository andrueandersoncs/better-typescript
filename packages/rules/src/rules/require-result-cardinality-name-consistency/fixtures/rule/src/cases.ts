interface User {
  readonly active: boolean
  readonly id: string
  readonly name: string
}

interface WishSource {
  readonly wish: string
}

export const getUser = (): ReadonlyArray<User> => [{ active: true, id: "1", name: "a" }] // ~detect 14

export const user = (): ReadonlyArray<User> => [{ active: true, id: "1", name: "a" }] // ~detect 14

export const userNames = (user: User): string => user.name // ~detect 14

export const getNames = (user: User): string => user.name // ~detect 14

export const optionalNames = (user: User): string | undefined => user.name // ~detect 14

export const userById = (): Record<string, User> => ({}) // ~detect 14

export const activeUser = (): ReadonlyArray<User> => [] // ~detect 14
export const getWishes = (source: WishSource): string => source.wish // ~detect 14

export function loadUser(): ReadonlyArray<User> { // ~detect 17
  return []
}

export class UserReader {
  getUser(): ReadonlyArray<User> { // ~detect 3
    return []
  }

  userNames(user: User): string { // ~detect 3
    return user.name
  }
}
