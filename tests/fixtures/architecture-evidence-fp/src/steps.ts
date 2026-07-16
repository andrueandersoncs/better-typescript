export const trim = (value: string): string => value.trim()

export const upper = (value: string): string => value.toUpperCase()

export const append =
  (suffix: string) =>
  (value: string): string =>
    `${value}${suffix}`
