export const fetchUser = async (id: string) => {
  const response = await fetch(`/users/${id}`)
  return response.json()
}
