interface User {
  readonly id: string
  readonly name: string
}

declare let writtenName: string

// Pure transform without a command verb.
export const trimmedUser = (user: User): User => ({
  id: user.id,
  name: user.name.trim()
})

// Void command uses command language.
export const writeUserName = (user: User): void => {
  writtenName = user.name
}
