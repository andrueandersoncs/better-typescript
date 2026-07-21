interface User {
  readonly id: string
  readonly name: string
}

export const isUser = (id: string): User => ({
  id,
  name: "anonymous"
})

export const getUser = (user: User): boolean => user.name.length > 0
