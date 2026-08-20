export const verboseName = (user: { name: string }) => {
  const value = user.name
  return value
}
export const pick = (user: { name: string }, fallback: string) => user.name
export const getCity = (user: { address: { city: string } }) =>
  user.address.city
export const getByKey = (dict: Record<string, number>) => dict["value"]
export const shout = (user: { name: string }) => user.name + "!"
