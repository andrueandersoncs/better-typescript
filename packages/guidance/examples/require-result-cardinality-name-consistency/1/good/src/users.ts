interface User {
  readonly id: string
}

export const getUser = (id: string): User => ({ id })

export const getUsers = (): ReadonlyArray<User> => Array.of({ id: "1" })
