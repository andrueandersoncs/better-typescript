export const normalize = (s: string): string => s.trim().toLowerCase()

export const label = (s: string): string => normalize(s)
export const key = (s: string): string => `k:${normalize(s)}`
