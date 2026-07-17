export {}

class Point {
  constructor(
    readonly x: number,
    readonly y: number
  ) {}
}

export const origin: Point = new Point(0, 0) // ~detect

declare const MathUtils: {
  readonly double: (value: number) => number
}

export const doubleFunction: (value: number) => number = MathUtils.double // ~detect

export const double = (value: number): number => value * 2 // ~detect

class User {
  constructor(readonly id: number) {}
}

export const createUser = (id: number): User => new User(id) // ~detect

export function triple(value: number): number { // ~detect
  return value * 3
}

declare const map: <A, B>(
  values: ReadonlyArray<A>,
  project: (value: A) => B
) => ReadonlyArray<B>

export const doubled = map([1, 2, 3], (value: number): number => value * 2) // ~detect
