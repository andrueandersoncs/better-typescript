export {}

class Point {
  constructor(
    readonly x: number,
    readonly y: number
  ) {}
}

export const origin: Point = new Point(0, 0)

declare const MathUtils: {
  readonly double: (value: number) => number
}

export const double: (value: number) => number = MathUtils.double
