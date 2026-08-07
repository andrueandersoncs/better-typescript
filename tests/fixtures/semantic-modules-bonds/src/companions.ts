export interface Box {
  readonly value: string
}

export interface Box {
  readonly size: number
}

export type Token = {
  readonly value: string
}

export const Token = (value: string): Token => ({ value })

export const unrelated = 1
