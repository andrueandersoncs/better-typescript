export {}

class Point {
  constructor(
    readonly x: number,
    readonly y: number
  ) {}
}

export const origin = new Point(0, 0)

declare const MathUtils: {
  readonly double: (value: number) => number
}

export const double = MathUtils.double

declare function emptyOf<T>(): Array<T>

export const numbers: Array<number> = emptyOf()

export const options: { readonly retry: boolean } = { retry: true }
