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
  readonly some: <A>(
    items: ReadonlyArray<A>,
    predicate: (item: A) => boolean
  ) => boolean
}

declare const match: <A>(value: A) => A

declare const pipe: {
  <A, B>(value: A, ab: (a: A) => B): B
  <A, B, C>(value: A, ab: (a: A) => B, bc: (b: B) => C): C
  <A, B, C, D>(value: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D
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

const alreadyFlow = flow(
  fileSubscriptions,
  Function.constant,
  checkFromSubscriptions
)

const alreadyPipe = (
  handler: (input: string) => ReadonlyArray<number>
): number =>
  pipe(fileSubscriptions(handler), Function.constant, checkFromSubscriptions)

const implicitReturnCandidate = (
  handler: (input: string) => ReadonlyArray<number>
): number => {
  return checkFromSubscriptions(Function.constant(fileSubscriptions(handler)))
}

const identityBinding = (n: number): number => {
  const next = n + 1

  return next
}

const namedFunctionBinding = (
  log: (value: string) => void
): ReadonlyArray<string> => {
  const handler = (input: string): ReadonlyArray<number> => {
    log(input)

    return [input.length]
  }

  return fileSubscriptions(handler)
}

const objectLiteralEmbed = (node: string): { readonly node: string } => {
  const name = node

  return match({ node: name })
}

const multiArgCall = (items: ReadonlyArray<number>): boolean => {
  const values = items

  return Array.some(values, (item) => item > 0)
}

const controlFlowBody = (n: number): number => {
  const next = n + 1

  if (next > 10) {
    return next
  }

  return next * 2
}

const multiConstBody = (n: number): number => {
  const first = n + 1
  const second = first * 2

  return second
}
