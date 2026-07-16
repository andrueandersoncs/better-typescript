const normalize = (value: string): string => value.trim().toUpperCase()

export const format = (value: string): string => normalize(value)
