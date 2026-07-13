const normalize = (s: string): string => s.trim().toLowerCase()

export const saveUser = (name: string): string => `saved:${normalize(name)}`
