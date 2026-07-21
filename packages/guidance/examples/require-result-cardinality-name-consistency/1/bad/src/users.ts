interface User {
  readonly id: string
}

export const getUsers = (id: string): User => ({ id })

export const getUser = (): ReadonlyArray<User> => Array.of({ id: "1" })
