interface User {
  readonly id: string
  readonly name: string
}

declare let writtenName: string

// False command claim: save without void/command evidence.
export const saveUser = (user: User): User => ({
  id: user.id,
  name: user.name.trim()
})

// Hidden command: void result named like a result/projection.
export const userName = (user: User): void => {
  writtenName = user.name
}
