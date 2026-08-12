export const createUser = (name: string) => {
  const user = {
    _tag: "User" as const,
    name,
    createdAt: Date.now()
  }

  return user
}
