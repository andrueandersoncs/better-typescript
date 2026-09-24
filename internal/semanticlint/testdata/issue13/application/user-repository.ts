export const loadUserApplicationOperation = async (
  id: string,
): Promise<User> => vendor.get(id)
