export const normalize = (s: string): string => s.trim().toLowerCase()

export const saveUser = (name: string): string => {
  const normalized = normalize(name)
  return `saved:${normalized}`
}
