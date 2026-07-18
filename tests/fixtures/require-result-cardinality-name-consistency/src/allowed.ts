interface User {
  readonly active: boolean
  readonly id: string
  readonly name: string
}

interface ArrayBindingPattern {
  readonly elements: ReadonlyArray<string>
  readonly kind: string
}

interface SetAccessorDeclaration {
  readonly name: string
}

export const getUser = (id: string): User => ({ active: true, id, name: id })

export const getUsers = (): ReadonlyArray<User> => [{ active: true, id: "1", name: "a" }]

// Plural object aggregates are intentionally allowed even when the noun is plural.
export const users = (id: string): User => ({ active: true, id, name: id })

export const activeUsers = (users: ReadonlyArray<User>): ReadonlyArray<User> =>
  users.filter((user) => user.active)

export const optionalUser = (user?: User): User | undefined => user

export const usersById = (): Record<string, User> => ({})

export const getStatus = (): string => "ready"

export const getSeries = (): ReadonlyArray<User> => []

// Nested-domain type names must not look like collection carriers.
export const getArrayBindingPattern = (
  value: ArrayBindingPattern
): ArrayBindingPattern => value

export const optionalSetAccessorDeclaration = (
  value?: SetAccessorDeclaration
): SetAccessorDeclaration | undefined => value

export const getSetAccessorDeclaration = (
  value: SetAccessorDeclaration
): SetAccessorDeclaration => value

export class UserStore {
  getUsers(): ReadonlyArray<User> {
    return []
  }

  getUser(id: string): User {
    return { active: true, id, name: id }
  }
}
