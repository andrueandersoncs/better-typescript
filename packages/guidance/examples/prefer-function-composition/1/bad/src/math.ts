export {}

declare const fileSubscriptions: (
  handler: (input: string) => ReadonlyArray<number>
) => ReadonlyArray<string>

declare const matcherFromSubscriptions: (plan: () => ReadonlyArray<string>) => number

declare const Function: {
  readonly constant: <A>(value: A) => () => A
}

export const fileMatcher = (handler: (input: string) => ReadonlyArray<number>): number => {
  const subscriptions = fileSubscriptions(handler)

  return matcherFromSubscriptions(Function.constant(subscriptions))
}
