export const stageOne = (value: string): string => value.trim()

export const stageTwo = (value: string): string => value.toUpperCase()

export const stageThree = (value: string): string => `${value}!`

export const otherOne = (value: string): string => value.toLowerCase()

export const otherTwo = (value: string): string => value.padStart(4, "0")

export const otherThree = (value: string): string => value.padEnd(8, ".")
