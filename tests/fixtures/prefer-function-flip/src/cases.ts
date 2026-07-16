export {}

declare const blockDelta: (
  previous: ReadonlyArray<string>
) => (current: ReadonlyArray<string>) => ReadonlyArray<string>

declare const current: ReadonlyArray<string>

declare const hasCallSignature: (
  checker: unknown
) => (type: unknown) => (extra: unknown) => boolean

declare const checker: unknown
declare const extra: unknown

declare const Option: {
  readonly match: <A, B>(
    option: A,
    cases: {
      readonly onNone: () => B
      readonly onSome: (value: ReadonlyArray<string>) => B
    }
  ) => B
}

export const flippedInline = ( // ~detect 30
  before: ReadonlyArray<string>
): ReadonlyArray<string> => blockDelta(before)(current)

export const flippedHandler = Option.match(null as never, {
  onNone: () => [],
  onSome: (before) => blockDelta(before)(current) // ~detect 11
})

export const flippedPartialCallee = (type: unknown): boolean => // ~detect 37
  hasCallSignature(checker)(type)(extra)
