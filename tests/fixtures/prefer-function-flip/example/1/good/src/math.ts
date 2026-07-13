export {}

declare const blockDelta: (
  current: string
) => (previous: string) => string

declare const current: string

export const onSome = blockDelta(current)
