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

export const fileCheck = (
  handler: (input: string) => ReadonlyArray<number>
): number => {
  const subscriptions = fileSubscriptions(handler)

  return checkFromSubscriptions(Function.constant(subscriptions))
}
