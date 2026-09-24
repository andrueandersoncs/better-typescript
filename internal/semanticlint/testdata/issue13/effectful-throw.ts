export const loadUser = async (id: string): Promise<User> => {
  try {
    return await vendor.get(id)
  } catch {
    throw new Error("missing")
  }
}
