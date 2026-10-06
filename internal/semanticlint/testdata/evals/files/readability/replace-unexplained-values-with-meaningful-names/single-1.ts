export const first = <A>(values: ReadonlyArray<A>): A | undefined => values[0]

export const isEmpty = <A>(values: ReadonlyArray<A>): boolean => values.length === 0

export const append = <A>(values: ReadonlyArray<A>, value: A): ReadonlyArray<A> => [
  ...values,
  value
]

export const prepend = <A>(values: ReadonlyArray<A>, value: A): ReadonlyArray<A> => [
  value,
  ...values
]

export const last = <A>(values: ReadonlyArray<A>): A | undefined => values.at(-1)
