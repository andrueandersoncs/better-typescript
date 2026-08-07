export function Codec(value: string): string
export function Codec(value: number): number
export function Codec(value: string | number) {
  return value
}

export namespace Codec {
  export type Options = {
    readonly strict: boolean
  }
}

export const unrelated = true
