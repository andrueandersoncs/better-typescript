export {}

declare const blockDelta: (
  current: ReadonlyArray<string>
) => (previous: ReadonlyArray<string>) => ReadonlyArray<string>

declare const flippedBlockDelta: (
  previous: ReadonlyArray<string>
) => (current: ReadonlyArray<string>) => ReadonlyArray<string>

declare const current: ReadonlyArray<string>

declare const Function: {
  readonly flip: <A, B, C>(
    f: (a: A) => (b: B) => C
  ) => (b: B) => (a: A) => C
}

declare const f: (left: string, right: string) => string

declare const fileName: string

export const alreadyDataLast = blockDelta(current)

export const usesFlip = Function.flip(flippedBlockDelta)(current)

export const usesParameterInOuter = (
  before: ReadonlyArray<string>
): ReadonlyArray<string> => flippedBlockDelta(before)(before)

export const bracedFlip = (
  before: ReadonlyArray<string>
): ReadonlyArray<string> => {
  return flippedBlockDelta(before)(current)
}

export const multiArg = (before: string): string => f(before, "x")

export const methodReceiver = (segment: string): boolean =>
  fileName.includes(segment)
