const normalize = (value: string): string => value.trim().toUpperCase()

export const alpha = (value: string): string => normalize(value)
export const beta = (value: string): string => normalize(value)
export const gamma = (value: string): string => normalize(value)
export const format = (value: string): string => `${value}!`
