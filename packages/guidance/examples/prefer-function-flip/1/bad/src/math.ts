export {}

declare const blockDelta: (previous: string) => (current: string) => string

declare const current: string

export const onSome = (before: string): string => blockDelta(before)(current)
