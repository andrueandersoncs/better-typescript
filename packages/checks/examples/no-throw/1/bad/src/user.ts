export const requireName = (name: string | null): string => {
  if (name === null) {
    throw new Error("User not found")
  }

  return name
}
