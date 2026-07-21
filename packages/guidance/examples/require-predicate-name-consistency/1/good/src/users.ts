interface User {
  readonly id: string
  readonly name: string
}

export const makeUser = (id: string): User => ({
  id,
  name: "anonymous"
})

export const hasUserName = (user: User): boolean => user.name.length > 0

export const wordsMatch = (left: string, right: string): boolean => left === right

export const declarationHasName = (declaration: { readonly name?: string }): boolean =>
  declaration.name !== undefined
