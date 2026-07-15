export {}

declare const fileSubscriptions: (
  handler: (input: string) => ReadonlyArray<number>
) => ReadonlyArray<string>

declare const checkFromSubscriptions: (
  plan: () => ReadonlyArray<string>
) => number

declare const Function: {
  readonly constant: <A>(value: A) => () => A
}

declare const Array: {
  readonly flatten: <A>(
    groups: ReadonlyArray<ReadonlyArray<A>>
  ) => ReadonlyArray<A>
}

declare const Option: {
  readonly fromNullishOr: <A>(value: A | null | undefined) => A | null
}

declare const pipe: {
  <A, B>(value: A, ab: (a: A) => B): B
  <A, B, C>(value: A, ab: (a: A) => B, bc: (b: B) => C): C
}

const fileCheckLike = (
  handler: (input: string) => ReadonlyArray<number>
): number => {
  const subscriptions = fileSubscriptions(handler)

  return checkFromSubscriptions(Function.constant(subscriptions))
}

const combineAllLike = (
  groups: ReadonlyArray<ReadonlyArray<string>>
): number => {
  const subscriptions = Array.flatten(groups)

  return checkFromSubscriptions(Function.constant(subscriptions))
}

const unaryWrap = (symbol: string | null): string | null => {
  const value = symbol

  return Option.fromNullishOr(value)
}

const pipeAfterBinding = (symbol: string | null): string | null => {
  const value = Option.fromNullishOr(symbol)

  return pipe(value, (current) => current)
}
