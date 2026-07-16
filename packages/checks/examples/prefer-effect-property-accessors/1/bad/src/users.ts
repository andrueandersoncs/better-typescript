interface User {
  readonly name: string
}

export const getName = (user: User): string => user.name
