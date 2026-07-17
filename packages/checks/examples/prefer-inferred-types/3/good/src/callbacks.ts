export {}

declare const map: <A, B>(values: ReadonlyArray<A>, project: (value: A) => B) => ReadonlyArray<B>

export const doubled = map([1, 2, 3], (value) => value * 2)

declare function zipWith<A, B, C>(
  left: ReadonlyArray<A>,
  right: ReadonlyArray<B>,
  combine: (left: A, right: B) => C
): ReadonlyArray<C>

export const pairs = zipWith([], [], (left: string, right: number) => `${left}:${right}`)

export const read = (value: unknown) => (typeof value === "string" ? value : String(value))
