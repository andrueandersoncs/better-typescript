declare const left: ReadonlyArray<string>
declare const right: ReadonlyArray<string>
declare const items: ReadonlyArray<string>
declare const extra: string
declare const first: string

export const combined = [...left, ...right]
export const withTail = [...items, extra]
export const withHead = [first, ...items]
