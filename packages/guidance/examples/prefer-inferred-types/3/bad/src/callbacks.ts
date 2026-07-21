export {}

declare const map: <A, B>(values: ReadonlyArray<A>, project: (value: A) => B) => ReadonlyArray<B>

export const doubled = map([1, 2, 3], (value: number): number => value * 2)
