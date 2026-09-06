export const Equivalence: {
  strictEqual<A>(): (left: A, right: A) => boolean
}

export type NonEmptyReadonlyArray<A> = readonly [A, ...ReadonlyArray<A>]

export const Array: {
  some<A>(values: ReadonlyArray<A>, predicate: (value: A, index: number) => boolean): values is NonEmptyReadonlyArray<A>
}
