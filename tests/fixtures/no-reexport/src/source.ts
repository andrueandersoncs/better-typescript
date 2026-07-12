export type SharedType = {
  readonly value: string
}

export const sharedValue = "shared"

export const sharedFunction = (input: string): string => input
