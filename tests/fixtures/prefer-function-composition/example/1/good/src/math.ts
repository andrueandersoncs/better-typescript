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

declare const flow: {
  <A extends ReadonlyArray<unknown>, B>(ab: (...a: A) => B): (...a: A) => B
  <A extends ReadonlyArray<unknown>, B, C>(
    ab: (...a: A) => B,
    bc: (b: B) => C
  ): (...a: A) => C
  <A extends ReadonlyArray<unknown>, B, C, D>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D
  ): (...a: A) => D
}

export const fileCheck = flow(
  fileSubscriptions,
  Function.constant,
  checkFromSubscriptions
)
