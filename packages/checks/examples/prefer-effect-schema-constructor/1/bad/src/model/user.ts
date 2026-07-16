export const createUser = (name: string) => ({
  _tag: "User" as const,
  name,
  createdAt: Date.now()
})
